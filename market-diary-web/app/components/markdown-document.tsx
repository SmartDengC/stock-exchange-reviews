import { parseTables, stripMarkdown } from "../lib/reviews";
import type { ReactNode } from "react";

function Inline({ text }: { text: string }) {
  const pieces = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return pieces.map((piece, index) => {
    if (piece.startsWith("**") && piece.endsWith("**")) return <strong key={index}>{piece.slice(2, -2)}</strong>;
    if (piece.startsWith("`") && piece.endsWith("`")) return <code key={index}>{piece.slice(1, -1)}</code>;
    return piece;
  });
}

function ReportTable({ source }: { source: string[] }) {
  const table = parseTables(source.join("\n"))[0];
  if (!table) return null;
  return <div className="report-table-wrap"><table className="report-table"><thead><tr>{table.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{table.rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((value, cellIndex) => <td key={cellIndex} className={cellIndex > 0 ? `tone-${/[-−]|跌/.test(value) ? "negative" : /\+|涨/.test(value) ? "positive" : "neutral"}` : ""}>{value}</td>)}</tr>)}</tbody></table></div>;
}

export function MarkdownDocument({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || /^---+$/.test(line.trim())) { index += 1; continue; }
    if (/^```/.test(line)) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) code.push(lines[index++]);
      index += 1;
      nodes.push(<pre className="report-code" key={`code-${index}`}>{code.join("\n")}</pre>);
      continue;
    }
    if (/^\s*\|/.test(line) && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? "")) {
      const source = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && /^\s*\|/.test(lines[index])) source.push(lines[index++]);
      nodes.push(<ReportTable key={`table-${index}`} source={source} />);
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      const content = stripMarkdown(heading[2]);
      const Tag = (`h${level + 1}` as "h2" | "h3" | "h4" | "h5");
      nodes.push(<Tag key={`heading-${index}`} className={`report-h report-h-${level}`}><Inline text={content} /></Tag>);
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      nodes.push(<blockquote key={`quote-${index}`}><Inline text={stripMarkdown(line)} /></blockquote>);
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const list: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) list.push(lines[index++].replace(/^[-*]\s+/, ""));
      nodes.push(<ul key={`list-${index}`}>{list.map((item) => <li key={item}><Inline text={stripMarkdown(item)} /></li>)}</ul>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,4}\s|```|>\s?|\s*\||[-*]\s+)/.test(lines[index])) paragraph.push(lines[index++]);
    nodes.push(<p key={`paragraph-${index}`}><Inline text={stripMarkdown(paragraph.join(" "))} /></p>);
  }
  return <article className="markdown-document">{nodes}</article>;
}
