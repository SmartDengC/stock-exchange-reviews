import type { Page, Route } from '@playwright/test';
import { expect, test } from '@playwright/test';

const sessionUser = {
  loggedIn: true,
  user: { role: 'user', username: 'admin' },
};

const review = {
  id: 'review-1',
  kind: 'daily',
  slug: '2026-08-26',
  title: '2026年8月26日（周二）多市场复盘',
  dateLabel: '2026-08-26',
  content: [
    '# 2026年8月26日（周二）多市场复盘',
    '',
    '2026-08-26',
    '',
    '## 2026年8月26日（周三）多市场复盘',
    '',
    '- 头号主线：英伟达+美债 → 油价两连跌',
    '',
    '> 黄金小结：地缘冲突升级反成利空。',
    '',
    '| 指数 | 收盘 | 涨跌幅 |',
    '|------|---:|---:|',
    '| 上证指数 | 3912.52 | +0.59% |',
  ].join('\n'),
};

test.describe('markdown document rendering', () => {
  test('renders markdown headings as h1/h2, not literal # text', async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({ json: sessionUser });
    });
    await page.route('**/api/reviews/daily/2026-08-26', async (route) => {
      await route.fulfill({ json: review });
    });

    await page.goto('/report/daily/2026-08-26', { waitUntil: 'networkidle' });

    await page.waitForSelector('.markdown-document');

    const html = await page.evaluate(
      () => document.querySelector('.markdown-document')?.innerHTML ?? '',
    );

    // Headings must become real elements, not literal markdown markers.
    expect(html).toContain('<h1>');
    expect(html).toContain('</h1>');
    expect(html).toContain('<h2>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<table>');
    expect(html).not.toContain('# 2026年8月26日');
    expect(html).not.toContain('## 2026年8月26日');
  });
});
