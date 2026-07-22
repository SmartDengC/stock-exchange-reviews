import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";

test("generates the research terminal and every report route as static HTML", async () => {
  const reviewsRoot = new URL("../../reviews/", import.meta.url);
  const weeklyDirectory = new URL("weekly/", reviewsRoot);
  const [indexHtml, dailyEntries, weeklyEntries] = await Promise.all([
    readFile(new URL("../.output/public/index.html", import.meta.url), "utf8"),
    readdir(reviewsRoot),
    readdir(weeklyDirectory),
  ]);

  const dailySlugs = dailyEntries.filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name)).map((name) => name.slice(0, -3));
  const weeklySlugs = weeklyEntries.filter((name) => /^\d{4}-W\d{2}\.md$/.test(name)).map((name) => name.slice(0, -3));

  assert.match(indexHtml, /周度研究终端/);
  assert.match(indexHtml, /跨市场表现/);
  assert.match(indexHtml, /不构成任何投资建议/);
  assert.match(indexHtml, /浅色/);

  for (const slug of weeklySlugs) {
    assert.match(indexHtml, new RegExp(`/report/weekly/${slug}`));
    const reportHtml = await readFile(new URL(`../.output/public/report/weekly/${slug}/index.html`, import.meta.url), "utf8");
    assert.match(reportHtml, /WEEKLY REVIEW/);
  }

  for (const slug of dailySlugs) {
    assert.match(indexHtml, new RegExp(`/report/daily/${slug}`));
    const reportHtml = await readFile(new URL(`../.output/public/report/daily/${slug}/index.html`, import.meta.url), "utf8");
    assert.match(reportHtml, /DAILY REVIEW/);
  }
});
