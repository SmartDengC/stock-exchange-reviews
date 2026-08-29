export type Table = { headers: string[]; rows: string[][] };

export type ReviewRecord = {
  dateLabel: string;
  kind: "daily" | "weekly";
  raw: string;
  slug: string;
  tables: Table[];
  title: string;
};

/**
 * 按归档标识排序研究复盘列表
 * 
 * 排序规则：
 * - weekly 类型：按 slug 降序排序（最新的周在前面）
 *   - 使用 numeric: true 确保周号正确排序（W10 > W09）
 *   - 例如：2026-W10 > 2026-W09 > 2025-W52
 * - daily 类型：保持接口返回的原始顺序
 * 
 * @param reviews 复盘列表
 * @param kind 复盘类型（daily/weekly）
 * @returns 排序后的新数组（不修改原数组）
 * 
 * @example
 * // weekly 排序
 * sortResearchReviewsByArchiveIdentifier(
 *   [{ kind: "weekly", slug: "2025-W52" }, { kind: "weekly", slug: "2026-W10" }],
 *   "weekly"
 * )
 * // 返回：[{ slug: "2026-W10" }, { slug: "2025-W52" }]
 */
export function sortResearchReviewsByArchiveIdentifier<
  T extends { kind: "daily" | "weekly"; slug: string },
>(reviews: T[], kind: "daily" | "weekly"): T[] {
  // daily 类型保持原始顺序，直接返回
  if (kind !== "weekly") return reviews;
  // weekly 类型按 slug 降序排序（最新的周在前面）
  // numeric: true 确保数字部分按数值比较（W10 > W09）
  // sensitivity: "base" 忽略大小写差异
  return [...reviews].sort((left, right) =>
    right.slug.localeCompare(left.slug, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

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
  dateLabel = dateLabel.replaceAll(/[！-～]/g, (character) =>
    String.fromCodePoint((character.codePointAt(0) ?? 0) - 0xFE_E0),
  ).replaceAll('－', "-");
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
    .replaceAll(/[*_`]/g, "")
    .replaceAll(/(?:🟢|🔴|💀|☠️|🚀|🔥|🛢️|🛡️|📉|📈|🔄)/gu, "")
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
    const parseRow = (line: string) =>
      line.trim().replaceAll(/^\||\|$/g, "").split("|").map((item) => cell(item));
    const headers = parseRow(lines[index] ?? "");
    const rows: string[][] = [];
    index += 2;
    while (index < lines.length && /^\s*\|/.test(lines[index] ?? "")) {
      rows.push(parseRow(lines[index] ?? ""));
      index += 1;
    }
    if (headers.length > 1 && rows.length > 0) tables.push({ headers, rows });
  }
  return tables;
}

export function section(markdown: string, heading: string) {
  const escaped = heading.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const expression = new RegExp(String.raw`^#{2,4}\s+.*${escaped}.*$([\s\S]*?)(?=^#{1,4}\s+|(?![\s\S]))`, "mi");
  return markdown.match(expression)?.[1]?.trim() ?? "";
}

export function firstTable(markdown: string, heading: string) {
  return parseTables(section(markdown, heading))[0] ?? null;
}

export function tableForHeading(markdown: string, heading: string, offset = 0) {
  return parseTables(section(markdown, heading))[offset] ?? null;
}

export function findRow(table: null | Table, name: string) {
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
