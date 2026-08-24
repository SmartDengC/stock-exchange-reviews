import type { Page, Route } from '@playwright/test';

import { expect, test } from '@playwright/test';

const sessionUser = {
  loggedIn: true,
  user: { role: 'user', username: 'admin' },
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json',
    status,
  });
}

async function mockTradingCloud(page: Page, loggedIn = true) {
  let authenticated = loggedIn;
  await page.route('http://localhost:8000/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/auth/session') {
      await json(route, authenticated ? sessionUser : { loggedIn: false, user: null });
      return;
    }
    if (path === '/api/auth/login') {
      authenticated = true;
      await json(route, sessionUser);
      return;
    }
    if (path === '/api/trading/trades') {
      await json(route, { page: 1, pageSize: 50, total: 0, totalPages: 0, trades: [] });
      return;
    }
    if (path === '/api/reviews') {
      await json(route, []);
      return;
    }
    await json(route, { detail: `Unhandled test endpoint: ${path}` }, 404);
  });
}

test('restores an unauthenticated deep link after login', async ({ page }) => {
  await mockTradingCloud(page, false);
  await page.goto('/trading/trades?status=open');

  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await page.getByLabel('账号').fill('admin');
  await page.getByLabel('密码').fill('secret');
  await page.getByRole('button', { name: /登\s*录/ }).click();

  await expect(page).toHaveURL(/\/trading\/trades\?status=open/);
  await expect(page.getByRole('heading', { name: '交易记录' })).toBeVisible();
});

test('opens a protected SPA route directly and renders its empty state', async ({ page }) => {
  await mockTradingCloud(page);
  await page.goto('/trading/trades');

  await expect(page).toHaveURL(/\/trading\/trades$/);
  await expect(page.getByRole('heading', { name: '交易记录' })).toBeVisible();
  await expect(page.getByText('没有匹配的交易记录')).toBeVisible();
});

test('legacy trading login redirects to the canonical login route', async ({ page }) => {
  await mockTradingCloud(page, false);
  await page.goto('/trading/login');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '登录研究终端' })).toBeVisible();
});

test('renders the protected 404 fallback for an unknown SPA route', async ({ page }) => {
  await mockTradingCloud(page);
  await page.goto('/not-a-market-diary-route');

  await expect(page.getByText('抱歉，我们无法找到您要找的页面。')).toBeVisible();
});
