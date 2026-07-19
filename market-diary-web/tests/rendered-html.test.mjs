import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("ships the market-diary product instead of the starter preview", async () => {
  const [page, layout, dashboard, reviewSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/reviews.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<Dashboard/);
  assert.match(layout, /市场日记/);
  assert.match(dashboard, /跨市场表现/);
  assert.match(dashboard, /不构成任何投资建议/);
  assert.match(reviewSource, /import\.meta\.glob/);
  assert.match(reviewSource, /reviews\/\*\*\/\*\.md/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});
