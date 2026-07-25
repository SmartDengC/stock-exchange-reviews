import { describe, expect, it } from "vitest";
import {
  TradingAttachmentValidationError,
  validateAttachmentCompletion,
} from "../server/utils/trading-attachments";

const tradeId = "63a9eb33-0ac4-49c7-a65a-06184dfef2db";

describe("trading attachment completion validation", () => {
  it("accepts metadata for a blob inside the target trade prefix", () => {
    expect(validateAttachmentCompletion({
      pathname: `trades/${tradeId}/chart-random.png`,
      fileName: "chart.png",
      width: 1920,
      height: 1080,
    }, tradeId)).toEqual({
      pathname: `trades/${tradeId}/chart-random.png`,
      fileName: "chart.png",
      width: 1920,
      height: 1080,
    });
  });

  it("rejects a pathname belonging to another trade", () => {
    expect(() => validateAttachmentCompletion({
      pathname: "trades/another-trade/chart.png",
      fileName: "chart.png",
    }, tradeId)).toThrowError(new TradingAttachmentValidationError("上传目标不合法"));
  });

  it.each([
    [{ pathname: `trades/${tradeId}/chart.png`, fileName: "" }, "文件名不合法"],
    [{ pathname: `trades/${tradeId}/chart.png`, fileName: "chart.png", width: 0 }, "图片宽度不合法"],
    [{ pathname: `trades/${tradeId}/chart.png`, fileName: "chart.png", height: 1.5 }, "图片高度不合法"],
  ])("rejects invalid completion metadata", (input, message) => {
    expect(() => validateAttachmentCompletion(input, tradeId)).toThrow(message);
  });
});
