import { describe, expect, it } from "vitest";

import { getDefaultTradingDateRange } from "#/shared/trading-date-range";

describe("default trading date range", () => {
  it("uses the current Shanghai date and starts seven days earlier", () => {
    expect(getDefaultTradingDateRange(new Date("2026-07-25T10:00:00.000Z"))).toEqual({
      from: "2026-07-18",
      to: "2026-07-25",
    });
  });

  it("uses the next Shanghai date after 16:00 UTC", () => {
    expect(getDefaultTradingDateRange(new Date("2026-07-24T16:30:00.000Z"))).toEqual({
      from: "2026-07-18",
      to: "2026-07-25",
    });
  });

  it("handles month and year boundaries", () => {
    expect(getDefaultTradingDateRange(new Date("2026-01-02T08:00:00.000Z"))).toEqual({
      from: "2025-12-26",
      to: "2026-01-02",
    });
  });
});
