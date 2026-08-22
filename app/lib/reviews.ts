export type Table = { headers: string[]; rows: string[][] };

export type ReviewRecord = {
  slug: string;
  kind: "daily" | "weekly";
  title: string;
  dateLabel: string;
  raw: string;
  tables: Table[];
};

function isoWeekSlug(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday); // 本周四决定 ISO 年与周数
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function generateReviewSlug(kind: "daily" | "weekly", dateLabel: string, title = ""): string {
  // 全角转半角：中文输入法常打出 ２０２６－０８－２１，\d 不匹配全角
  dateLabel = dateLabel.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/－/g, "-");
  const dateMatch = dateLabel.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (kind === "daily") {
    if (dateMatch) return `${dateMatch[1]}-${dateMatch[2]!.padStart(2, "0")}-${dateMatch[3]!.padStart(2, "0")}`;
    const iso = dateLabel.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) return `${iso[1]}-${iso[2]!.padStart(2, "0")}-${iso[3]!.padStart(2, "0")}`;
    return "";
  }
  const explicit = dateLabel.match(/(\d{4})-W(\d{1,2})\b/);
  if (explicit) return `${explicit[1]}-W${explicit[2]!.padStart(2, "0")}`;
  const titleWeek = title.match(/(\d{4})年第(\d{1,2})周/);
  if (titleWeek) return `${titleWeek[1]}-W${titleWeek[2]!.padStart(2, "0")}`;
  if (dateMatch) return isoWeekSlug(+dateMatch[1]!, +dateMatch[2]!, +dateMatch[3]!);
  return "";
}

function cell(value: string) {
  return value
    .replace(/[*_`]/g, "")
    .replace(/(?:🟢|🔴|💀|☠️|🚀|🔥|🛢️|🛡️|📉|📈|🔄)/gu, "")
    .trim();
}

export function parseTables(markdown: string): Table[] {
  const lines = markdown.split("\n");
  const tables: Table[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!/^\s*\|/.test(lines[index] ?? "") || !/^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? "")) {
      index += 1;
      continue;
    }
    const parseRow = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map(cell);
    const headers = parseRow(lines[index] ?? "");
    const rows: string[][] = [];
    index += 2;
    while (index < lines.length && /^\s*\|/.test(lines[index] ?? "")) {
      rows.push(parseRow(lines[index] ?? ""));
      index += 1;
    }
    if (headers.length > 1 && rows.length) tables.push({ headers, rows });
  }
  return tables;
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
