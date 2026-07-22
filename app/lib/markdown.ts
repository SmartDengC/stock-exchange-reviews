import { parseTables, stripMarkdown, type Table } from "./reviews";

export type InlineToken =
  | { kind: "text" | "strong" | "code"; text: string }
  | { kind: "link"; text: string; href: string };

export type MarkdownBlock =
  | { kind: "code"; content: string }
  | { kind: "table"; table: Table }
  | { kind: "heading"; level: 1 | 2 | 3 | 4; content: string }
  | { kind: "quote"; content: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; content: string };

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((value) => stripMarkdown(value));
}

export function parseInline(text: string): InlineToken[] {
  return text
    .split(/(\*\*.*?\*\*|`.*?`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g)
    .filter(Boolean)
    .map<InlineToken>((piece) => {
      if (piece.startsWith("**") && piece.endsWith("**")) {
        return { kind: "strong", text: piece.slice(2, -2) };
      }
      if (piece.startsWith("`") && piece.endsWith("`")) {
        return { kind: "code", text: piece.slice(1, -1) };
      }
      const link = piece.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (link) {
        return { kind: "link", text: link[1] ?? link[2] ?? "", href: link[2] ?? "" };
      }
      return { kind: "text", text: piece };
    });
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim() || /^---+$/.test(line.trim())) {
      index += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index] ?? "")) code.push(lines[index++] ?? "");
      if (index < lines.length) index += 1;
      blocks.push({ kind: "code", content: code.join("\n") });
      continue;
    }

    if (/^\s*\|/.test(line) && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? "")) {
      const source = [line, lines[index + 1] ?? ""];
      index += 2;
      while (index < lines.length && /^\s*\|/.test(lines[index] ?? "")) source.push(lines[index++] ?? "");
      const table = parseTables(source.join("\n"))[0];
      if (table) blocks.push({ kind: "table", table });
      continue;
    }

    // Accept compact key/value rows such as `| 南向资金 | 净买入 75 亿 |`.
    // They are not complete GFM tables, but occur in generated review files.
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = [];
      while (index < lines.length && /^\s*\|/.test(lines[index] ?? "")) {
        rows.push(parseTableRow(lines[index++] ?? ""));
      }
      blocks.push({ kind: "table", table: { headers: [], rows } });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: Math.min(heading[1]!.length, 4) as 1 | 2 | 3 | 4,
        content: stripMarkdown(heading[2] ?? ""),
      });
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      blocks.push({ kind: "quote", content: stripMarkdown(line) });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index] ?? "")) {
        items.push(stripMarkdown((lines[index++] ?? "").replace(/^[-*]\s+/, "")));
      }
      blocks.push({ kind: "list", items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length
      && (lines[index] ?? "").trim()
      && !/^(#{1,4}\s|```|\s*>\s?|\s*\||[-*]\s+)/.test(lines[index] ?? "")
    ) {
      paragraph.push(lines[index++] ?? "");
    }
    // Unknown Markdown must still consume a line; otherwise this loop never advances.
    if (!paragraph.length) paragraph.push(lines[index++] ?? "");
    blocks.push({ kind: "paragraph", content: stripMarkdown(paragraph.join(" ")) });
  }

  return blocks;
}
