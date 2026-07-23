import { describe, expect, it } from "vitest";
import { sanitizeMarkdownHtml } from "~/lib/markdown-sanitize";

describe("Markdown HTML sanitizing", () => {
  it("removes scripts, event handlers, and unsafe link schemes", () => {
    const output = sanitizeMarkdownHtml(`
      <script>alert("xss")</script>
      <img src="https://example.com/chart.png" onerror="alert(1)">
      <a href="javascript:alert(1)" onclick="alert(2)">危险链接</a>
    `);

    expect(output).not.toContain("<script");
    expect(output).not.toContain("onerror");
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("javascript:");
    expect(output).toContain("noopener noreferrer");
  });

  it("keeps the tags required by market review documents", () => {
    const output = sanitizeMarkdownHtml(`
      <h1>市场复盘</h1>
      <blockquote><p>核心结论</p></blockquote>
      <table><tbody><tr><td>上证</td><td>+1.2%</td></tr></tbody></table>
      <pre><code>price = 3764</code></pre>
    `);

    expect(output).toContain("<h1>市场复盘</h1>");
    expect(output).toContain("<blockquote>");
    expect(output).toContain("<table>");
    expect(output).toContain("<pre><code>");
  });
});
