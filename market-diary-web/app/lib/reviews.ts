export type Table = { headers: string[]; rows: string[][] };

export type ReviewRecord = {
  slug: string;
  kind: "daily" | "weekly";
  title: string;
  dateLabel: string;
  raw: string;
  tables: Table[];
};

type RawModuleMap = Record<string, string>;

const rawModules = import.meta.glob("../../../reviews/**/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as RawModuleMap;

function cell(value: string) {
  return value
    .replace(/[*_`]/g, "")
    .replace(/[🟢🔴💀☠️🚀🔥🛢️🛡️📉📈🔄]/gu, "")
    .trim();
}

export function parseTables(markdown: string): Table[] {
  const lines = markdown.split("\n");
  const tables: Table[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!/^\s*\|/.test(lines[index]) || !/^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? "")) {
      index += 1;
      continue;
    }
    const parseRow = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map(cell);
    const headers = parseRow(lines[index]);
    const rows: string[][] = [];
    index += 2;
    while (index < lines.length && /^\s*\|/.test(lines[index])) {
      rows.push(parseRow(lines[index]));
      index += 1;
    }
    if (headers.length > 1 && rows.length) tables.push({ headers, rows });
  }
  return tables;
}

function recordFromPath(path: string, raw: string): ReviewRecord {
  const isWeekly = path.includes("/weekly/");
  const match = path.match(/(\d{4}-(?:W\d{2}|\d{2}-\d{2}))\.md$/);
  const slug = match?.[1] ?? path;
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.replace(/^📊\s*/, "") ?? slug;
  const date = raw.match(/\*\*时间范围：\*\*\s*([^\n]+)/)?.[1]
    ?? raw.match(/\*\*报告日期：\*\*\s*([^\n]+)/)?.[1]
    ?? title.match(/\d{4}年\d{1,2}月\d{1,2}日[^\n]*/)?.[0]
    ?? slug;
  return { slug, kind: isWeekly ? "weekly" : "daily", title, dateLabel: date, raw, tables: parseTables(raw) };
}

export const reviews = Object.entries(rawModules)
  .map(([path, raw]) => recordFromPath(path, raw))
  .sort((left, right) => right.slug.localeCompare(left.slug));

export const weeklyReviews = reviews.filter((review) => review.kind === "weekly");
export const dailyReviews = reviews.filter((review) => review.kind === "daily");

export function getLatestWeeklyReview() {
  return weeklyReviews[0] ?? null;
}

export function getReview(kind: ReviewRecord["kind"], slug: string) {
  return reviews.find((review) => review.kind === kind && review.slug === slug) ?? null;
}

export function section(markdown: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`^#{2,4}\\s+.*${escaped}.*$([\\s\\S]*?)(?=^#{1,4}\\s+|(?![\\s\\S]))`, "mi");
  return markdown.match(expression)?.[1]?.trim() ?? "";
}

export function firstTable(markdown: string, heading: string) {
  return parseTables(section(markdown, heading))[0] ?? null;
}

export function tableForHeading(markdown: string, heading: string, offset = 0) {
  return parseTables(section(markdown, heading))[offset] ?? null;
}

export function findRow(table: Table | null, name: string) {
  return table?.rows.find((row) => row[0]?.includes(name)) ?? null;
}

export function changeTone(value = "") {
  if (/[-−]|跌|流出|恐慌|崩/.test(value)) return "negative";
  if (/\+|涨|流入|反弹|跑赢/.test(value)) return "positive";
  return "neutral";
}

export function stripMarkdown(value: string) {
  return cell(value).replace(/^>\s?/, "");
}
