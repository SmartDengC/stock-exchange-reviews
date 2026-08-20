import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const reviewsRoot = join(projectRoot, "reviews");

const dailyReviewPattern = /^\d{4}-\d{2}-\d{2}\.md$/;
const weeklyReviewPattern = /^weekly\/\d{4}-W\d{2}\.md$/;

function parseTitle(raw) {
  const match = raw.match(/^#{1,4}\s+(.+)$/m);
  return match?.[1]?.replace(/^📊\s*/, "") ?? "";
}

function parseDateLabel(raw) {
  return raw.match(/\*\*时间范围：\*\*\s*([^\n]+)/)?.[1]
    ?? raw.match(/\*\*报告日期：\*\*\s*([^\n]+)/)?.[1]
    ?? "";
}

async function collectMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdown(fullPath);
    if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
    return [];
  }));
  return files.flat();
}

const url = process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("请设置 NUXT_DATABASE_URL、DATABASE_URL 或 POSTGRES_URL 环境变量");
  process.exit(1);
}

const sql = neon(url);

const markdownFiles = (await collectMarkdown(reviewsRoot))
  .filter((file) => {
    const reviewPath = relative(reviewsRoot, file).replaceAll("\\", "/");
    return dailyReviewPattern.test(reviewPath) || weeklyReviewPattern.test(reviewPath);
  })
  .sort();

console.log(`找到 ${markdownFiles.length} 个复盘文件`);

let inserted = 0;
let skipped = 0;

for (const file of markdownFiles) {
  const reviewPath = relative(reviewsRoot, file).replaceAll("\\", "/");
  const content = await readFile(file, "utf8");
  const isWeekly = weeklyReviewPattern.test(reviewPath);
  const kind = isWeekly ? "weekly" : "daily";
  const slugMatch = reviewPath.match(isWeekly ? /weekly\/(\d{4}-W\d{2})\.md$/ : /(\d{4}-\d{2}-\d{2})\.md$/);
  const slug = slugMatch?.[1];
  if (!slug) { skipped++; continue; }

  const title = parseTitle(content) || slug;
  const dateLabel = parseDateLabel(content) || slug;

  const existing = await sql`SELECT id FROM research_reviews WHERE kind = ${kind} AND slug = ${slug} AND deleted_at IS NULL`;
  if (existing.length) {
    console.log(`跳过 (已存在): ${kind}/${slug}`);
    skipped++;
    continue;
  }

  await sql`INSERT INTO research_reviews (kind, slug, title, date_label, content) VALUES (${kind}, ${slug}, ${title}, ${dateLabel}, ${content})`;
  console.log(`插入: ${kind}/${slug}`);
  inserted++;
}

console.log(`完成: ${inserted} 条插入, ${skipped} 条跳过`);
