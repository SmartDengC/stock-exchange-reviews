import { describe, expect, it } from "vitest";

import { generateReviewSlug } from "#/lib/reviews";

describe("generateReviewSlug", () => {
  it(String.raw`daily 从日期标签生成补零 slug（匹配服务端 ^\d{4}-\d{2}-\d{2}$ 校验）`, () => {
    expect(generateReviewSlug("daily", "2026年8月14日（周五）")).toBe("2026-08-14");
    expect(generateReviewSlug("daily", "2026年8月1日")).toBe("2026-08-01");
    expect(generateReviewSlug("daily", "2026-08-14")).toBe("2026-08-14");
    expect(generateReviewSlug("daily", "2026-8-4（周五）")).toBe("2026-08-04");
    expect(generateReviewSlug("daily", "2026/8/14")).toBe("2026-08-14");
    expect(generateReviewSlug("daily", "２０２６－０８－１４")).toBe("2026-08-14"); // 全角
    expect(generateReviewSlug("daily", "２０２６年８月１４日")).toBe("2026-08-14"); // 全角
    expect(generateReviewSlug("daily", "08/14/2026")).toBe("");
  });

  it("weekly 优先使用日期标签中的显式周号", () => {
    expect(generateReviewSlug("weekly", "2026-W34 第34周")).toBe("2026-W34");
    expect(generateReviewSlug("weekly", "2026年第34周，编号 2026-W4")).toBe("2026-W04");
  });

  it("weekly 从标题的第 N 周生成周号", () => {
    expect(generateReviewSlug("weekly", "2026年8月10日-14日", "2026年第33周 市场周报")).toBe("2026-W33");
  });

  it("weekly 从日期标签的日期计算 ISO 周号", () => {
    expect(generateReviewSlug("weekly", "2026年8月10日-14日")).toBe("2026-W33"); // 周一 08-10
    expect(generateReviewSlug("weekly", "2026年8月21日")).toBe("2026-W34"); // 周五 08-21
  });

  it("ISO 年份边界：年初周五归属上一年的最后一周", () => {
    expect(generateReviewSlug("weekly", "2027年1月1日")).toBe("2026-W53");
    expect(generateReviewSlug("weekly", "2027年1月4日")).toBe("2027-W01"); // 周一
  });

  it("无法解析时返回空字符串", () => {
    expect(generateReviewSlug("weekly", "第34周", "")).toBe("");
    expect(generateReviewSlug("weekly", "", "")).toBe("");
  });
});
