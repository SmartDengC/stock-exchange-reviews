import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdownBlocks } from "~/lib/markdown";
import { getReview } from "~/lib/reviews";

describe("new review Markdown structure", () => {
  it("turns safe Markdown URLs into link tokens", () => {
    expect(parseInline("查看[雪球](https://xueqiu.com/S/SH000001)行情")).toEqual([
      { kind: "text", text: "查看" },
      { kind: "link", text: "雪球", href: "https://xueqiu.com/S/SH000001" },
      { kind: "text", text: "行情" },
    ]);
    expect(parseInline("[危险链接](javascript:alert(1))")).toEqual([
      { kind: "text", text: "[危险链接](javascript:alert(1))" },
    ]);
  });

  it("renders compact tables without entering an infinite loop", () => {
    const blocks = parseMarkdownBlocks("| 南向资金 | 净买入 **75.17亿港元** |");

    expect(blocks).toEqual([{
      kind: "table",
      table: { headers: [], rows: [["南向资金", "净买入 75.17亿港元"]] },
    }]);
  });

  it("parses the 2026-07-22 review and its level-two title", () => {
    const review = getReview("daily", "2026-07-22");

    expect(review?.title).toBe("2026年7月22日（周三）多市场复盘");
    expect(review?.dateLabel).toContain("2026年7月22日");

    const blocks = parseMarkdownBlocks(review?.raw ?? "");
    const compactTables = blocks.filter((block) => block.kind === "table" && block.table.headers.length === 0);

    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.length).toBeLessThan(300);
    expect(compactTables).toHaveLength(3);
  });
});
