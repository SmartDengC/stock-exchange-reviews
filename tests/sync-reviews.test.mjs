import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);
const reviewsRoot = new URL("reviews/", projectRoot);

async function expectedReviewKeys() {
  const [dailyEntries, weeklyEntries] = await Promise.all([
    readdir(reviewsRoot),
    readdir(new URL("weekly/", reviewsRoot)),
  ]);

  return [
    ...dailyEntries
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
      .map((name) => `reviews/${name}`),
    ...weeklyEntries
      .filter((name) => /^\d{4}-W\d{2}\.md$/.test(name))
      .map((name) => `reviews/weekly/${name}`),
  ].sort();
}

test("syncs only dated reviews and registers their static routes", async () => {
  const [generatedSource, nuxtConfig, expectedKeys] = await Promise.all([
    readFile(new URL("app/lib/generated-reviews.ts", projectRoot), "utf8"),
    readFile(new URL("nuxt.config.ts", projectRoot), "utf8"),
    expectedReviewKeys(),
  ]);

  const serializedReviews = generatedSource
    .replace(/^.*?=\s*/s, "")
    .replace(/;\s*$/, "");
  const generatedReviews = JSON.parse(serializedReviews);
  const generatedKeys = Object.keys(generatedReviews).sort();

  assert.deepEqual(generatedKeys, expectedKeys);
  assert.equal(generatedKeys.includes("reviews/README.md"), false);
  assert.match(nuxtConfig, /const reportRoutes = reviews\.map\(reviewRoute\)/);
  assert.match(nuxtConfig, /routes:\s*\["\/", \.\.\.reportRoutes\]/);

  const routes = generatedKeys.map((path) => path.startsWith("reviews/weekly/")
    ? `/report/weekly/${path.slice("reviews/weekly/".length, -3)}`
    : `/report/daily/${path.slice("reviews/".length, -3)}`);

  assert.equal(routes.length, expectedKeys.length);
  assert.ok(routes.every((route) => /^\/report\/(daily\/\d{4}-\d{2}-\d{2}|weekly\/\d{4}-W\d{2})$/.test(route)));
});
