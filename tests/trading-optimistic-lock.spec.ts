import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dailyReviews,
  tradeAttachments,
  tradeErrorTags,
  trades,
} from "../db/schema";
import {
  saveDailyReview,
  softDeleteTrade,
  updateTrade,
} from "../server/utils/trading-repository";
import type { DailyReviewInput, TradeInput } from "../shared/types/trading";

const { getTradingDbMock } = vi.hoisted(() => ({
  getTradingDbMock: vi.fn(),
}));

vi.mock("../server/utils/trading-db", () => ({
  getTradingDb: getTradingDbMock,
}));

const tradeInput: TradeInput = {
  status: "closed",
  tradeDate: "2026-07-23",
  symbol: "MUUSDT",
  market: "crypto",
  side: "short",
  strategy: "区间反转",
  timeframe: "1分",
  entryAt: "2026-07-23T12:50:00.000Z",
  exitAt: "2026-07-23T13:54:00.000Z",
  entryReason: "趋势反转",
  exitReason: "按计划离场",
  entryPrice: "975.9",
  exitPrice: "933.93",
  positionSize: "800",
  positionBasis: "notional",
  settlementCurrency: "USDT",
  fees: "0.32",
  fxToCny: "6.77",
  errorTags: [],
};

function tradeRow(version = 1) {
  return {
    id: "63a9eb33-0ac4-49c7-a65a-06184dfef2db",
    ...tradeInput,
    instrumentCode: "MUUSDT",
    plannedRiskAmount: null,
    executionGrade: "C",
    emotion: "犹豫",
    errorNotes: null,
    didWell: null,
    nextImprovement: null,
    grossPnl: "-34.4052",
    netPnl: "-34.7252",
    pnlCny: "-235.09",
    rMultiple: null,
    holdMinutes: 64,
    isWinning: false,
    sourceFileHash: null,
    sourceRow: null,
    deletedAt: null,
    version,
    createdAt: new Date("2026-07-23T12:00:00.123Z"),
    updatedAt: new Date("2026-07-23T14:00:00.987Z"),
  };
}

function dailyReviewRow(version = 1) {
  return {
    id: "80aa9014-d87b-4bf4-a3aa-3527083b2630",
    reviewDate: "2026-07-23",
    marketPlan: "只做计划内交易",
    dailySummary: null,
    bestTradeId: null,
    biggestMistake: null,
    tomorrowOneThing: null,
    plannedOnly: true,
    followedStops: true,
    avoidedImpulseAdds: true,
    avoidedRevengeTrading: true,
    exitedAsPlanned: true,
    priorityFix: null,
    notes: null,
    deletedAt: null,
    version,
    createdAt: new Date("2026-07-23T14:00:00.123Z"),
    updatedAt: new Date("2026-07-23T14:00:00.987Z"),
  };
}

function fakeDb(initial: {
  trade?: ReturnType<typeof tradeRow> | null;
  review?: ReturnType<typeof dailyReviewRow> | null;
} = {}) {
  const state = {
    trade: initial.trade ?? null,
    review: initial.review ?? null,
    failNextTradeWrite: false,
    failNextReviewWrite: false,
    tradeVersionExpression: null as unknown,
    reviewVersionExpression: null as unknown,
  };

  const db = {
    select() {
      return {
        from(table: unknown) {
          if (table === trades) {
            return {
              where() {
                const rows = state.trade && !state.trade.deletedAt ? [state.trade] : [];
                return {
                  limit: async () => rows,
                  orderBy: () => ({ limit: async () => rows }),
                };
              },
            };
          }
          if (table === dailyReviews) {
            return {
              where: () => ({
                limit: async () => state.review && !state.review.deletedAt ? [state.review] : [],
              }),
            };
          }
          if (table === tradeAttachments) {
            return {
              where: () => ({ orderBy: async () => [] }),
            };
          }
          if (table === tradeErrorTags) {
            return {
              innerJoin: () => ({ where: async () => [] }),
            };
          }
          throw new Error("Unexpected select table");
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          return {
            where() {
              return {
                returning: async () => {
                  if (table === trades) {
                    state.tradeVersionExpression = values.version;
                    if (!state.trade || state.failNextTradeWrite) {
                      state.failNextTradeWrite = false;
                      return [];
                    }
                    const { version: _version, ...plainValues } = values;
                    state.trade = {
                      ...state.trade,
                      ...plainValues,
                      version: state.trade.version + 1,
                    } as ReturnType<typeof tradeRow>;
                    return [{ id: state.trade.id }];
                  }
                  if (table === dailyReviews) {
                    state.reviewVersionExpression = values.version;
                    if (!state.review || state.failNextReviewWrite) {
                      state.failNextReviewWrite = false;
                      return [];
                    }
                    const { version: _version, ...plainValues } = values;
                    state.review = {
                      ...state.review,
                      ...plainValues,
                      version: state.review.version + 1,
                    } as ReturnType<typeof dailyReviewRow>;
                    return [{ id: state.review.id }];
                  }
                  throw new Error("Unexpected update table");
                },
              };
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        async values(values: Record<string, unknown>) {
          if (table !== dailyReviews) throw new Error("Unexpected insert table");
          state.review = {
            ...dailyReviewRow(1),
            ...values,
            version: 1,
            createdAt: new Date(),
          } as ReturnType<typeof dailyReviewRow>;
        },
      };
    },
    delete(table: unknown) {
      if (table !== tradeErrorTags) throw new Error("Unexpected delete table");
      return { where: async () => undefined };
    },
  };

  return { db, state };
}

beforeEach(() => {
  vi.stubGlobal("createError", (input: { statusCode: number; message: string }) =>
    Object.assign(new Error(input.message), input));
  getTradingDbMock.mockReset();
});

describe("trading optimistic locking", () => {
  it("updates a trade using version and increments the returned version", async () => {
    const { db, state } = fakeDb({ trade: tradeRow(1) });
    getTradingDbMock.mockReturnValue(db);

    const result = await updateTrade({} as never, state.trade!.id, {
      ...tradeInput,
      version: 1,
    });

    expect(result.version).toBe(2);
    expect(state.tradeVersionExpression).toBeTruthy();
    expect(result.updatedAt).toBe(state.trade!.updatedAt.toISOString());
  });

  it("rejects a stale trade version and an atomic write race with 409", async () => {
    const { db, state } = fakeDb({ trade: tradeRow(2) });
    getTradingDbMock.mockReturnValue(db);

    await expect(updateTrade({} as never, state.trade!.id, { ...tradeInput, version: 1 }))
      .rejects.toMatchObject({ statusCode: 409 });

    state.failNextTradeWrite = true;
    await expect(updateTrade({} as never, state.trade!.id, { ...tradeInput, version: 2 }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(state.trade!.version).toBe(2);
  });

  it("deletes only with the current trade version", async () => {
    const { db, state } = fakeDb({ trade: tradeRow(3) });
    getTradingDbMock.mockReturnValue(db);

    await expect(softDeleteTrade({} as never, state.trade!.id, 2))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(state.trade!.deletedAt).toBeNull();

    await expect(softDeleteTrade({} as never, state.trade!.id, 3))
      .resolves.toEqual({ deleted: true, id: state.trade!.id });
    expect(state.trade!.version).toBe(4);
    expect(state.trade!.deletedAt).toBeInstanceOf(Date);
  });

  it("creates a daily review at version one and increments existing reviews", async () => {
    const { db, state } = fakeDb();
    getTradingDbMock.mockReturnValue(db);
    const input: DailyReviewInput = {
      reviewDate: "2026-07-23",
      marketPlan: "只做计划内交易",
    };

    const created = await saveDailyReview({} as never, input);
    expect(created.version).toBe(1);

    const updated = await saveDailyReview({} as never, {
      ...input,
      marketPlan: "等待确认后入场",
      version: 1,
    });
    expect(updated.version).toBe(2);
    expect(state.reviewVersionExpression).toBeTruthy();
  });

  it("rejects missing and stale versions for existing records", async () => {
    const { db, state } = fakeDb({
      trade: tradeRow(1),
      review: dailyReviewRow(2),
    });
    getTradingDbMock.mockReturnValue(db);

    await expect(updateTrade({} as never, state.trade!.id, tradeInput))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(softDeleteTrade({} as never, state.trade!.id))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(saveDailyReview({} as never, {
      reviewDate: state.review!.reviewDate,
    })).rejects.toMatchObject({ statusCode: 400 });
    await expect(saveDailyReview({} as never, {
      reviewDate: state.review!.reviewDate,
      version: 1,
    })).rejects.toMatchObject({ statusCode: 409 });
  });
});
