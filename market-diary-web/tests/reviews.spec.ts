import { describe, expect, it } from "vitest";
import { dailyReviews, getLatestWeeklyReview, getReview, parseTables, weeklyReviews } from "~/lib/reviews";
import { parseInline, parseMarkdownBlocks } from "~/lib/markdown";

describe("review data index", () => {
  it("discovers dated daily and weekly reviews", () => {
    expect(dailyReviews.length).toBeGreaterThan(0);
    expect(weeklyReviews.length).toBeGreaterThan(0);
    expect(dailyReviews.every((review) => /^\d{4}-\d{2}-\d{2}$/.test(review.slug))).toBe(true);
    expect(weeklyReviews.every((review) => /^\d{4}-W\d{2}$/.test(review.slug))).toBe(true);
  });

  it("selects the newest weekly review and resolves shareable routes", () => {
    const latest = getLatestWeeklyReview();
    expect(latest).toBe(weeklyReviews[0]);
    expect(latest && getReview("weekly", latest.slug)).toEqual(latest);
    expect(getReview("daily", "missing")).toBeNull();
  });

  it("parses markdown tables used by dashboard metrics", () => {
    const tables = parseTables("| 指标 | 数值 |\n| --- | --- |\n| 上证 | +1.2% |");
    expect(tables).toEqual([{ headers: ["指标", "数值"], rows: [["上证", "+1.2%"]] }]);
  });
});

describe("markdown document parser", () => {
  it("preserves headings, quotes, lists, tables and code blocks", () => {
    const blocks = parseMarkdownBlocks("## 标题\n\n> 结论\n\n- A\n- B\n\n| 项目 | 数值 |\n| --- | --- |\n| 沪指 | 1 |\n\n```\nconst ok = true\n```");
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "quote", "list", "table", "code"]);
  });

  it("tokenizes strong and inline code without rendering raw HTML", () => {
    expect(parseInline("普通 **重点** `代码`")).toEqual([
      { kind: "text", text: "普通 " },
      { kind: "strong", text: "重点" },
      { kind: "text", text: " " },
      { kind: "code", text: "代码" },
    ]);
  });
});
