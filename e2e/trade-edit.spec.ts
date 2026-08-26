import type { Page, Route } from '@playwright/test';

import { expect, test } from '@playwright/test';

const sessionUser = {
  loggedIn: true,
  user: { role: 'user', username: 'admin' },
};

// 与 tests/trade-edit-flow.spec.ts 保持一致的样例交易。
const sampleTrade = {
  id: 'trade-1',
  version: 4,
  status: 'closed',
  tradeDate: '2026-02-10',
  instrumentCode: 'MUUSDT',
  symbol: 'MU',
  market: 'crypto',
  side: 'long',
  strategy: '趋势突破',
  timeframe: '5 分',
  entryAt: '2026-02-10T02:30:00.000Z',
  entryPrice: '1.2',
  entryReason: '突破前高后回踩确认',
  exitAt: '2026-02-10T03:30:00.000Z',
  exitPrice: '1.4',
  exitReason: '到达目标位',
  positionBasis: 'notional',
  positionSize: '1000',
  settlementCurrency: 'USDT',
  plannedRiskAmount: '50',
  fees: '2',
  fxToCny: '7.2',
  executionGrade: 'A',
  emotion: '平静',
  errorTags: [] as string[],
  errorNotes: '',
  didWell: '按计划执行',
  nextImprovement: '',
  attachments: [],
  createdAt: '2026-02-10T04:00:00.000Z',
  updatedAt: '2026-02-10T04:00:00.000Z',
  deletedAt: null,
  grossPnl: '200',
  netPnl: '198',
  pnlCny: '1425.6',
  rMultiple: '3.96',
  isWinning: true,
  holdMinutes: 60,
};

// 后端 TradeInput（extra="forbid"）不允许的字段，PATCH body 不得携带。
const FORBIDDEN_TRADE_INPUT_KEYS = [
  'attachments',
  'createdAt',
  'deletedAt',
  'grossPnl',
  'holdMinutes',
  'id',
  'isWinning',
  'netPnl',
  'pnlCny',
  'rMultiple',
  'updatedAt',
];

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json',
    status,
  });
}

async function mockTradingCloud(page: Page) {
  // 捕获编辑弹窗「保存交易」发出的 PATCH 请求，供断言使用。
  // 开发模式下 VITE_GLOB_API_URL 为空串，请求走相对路径 /api
  // （由 Vite proxy 转发到 Trading Cloud），因此拦截同源 :3000。
  const patchBodies: Array<Record<string, unknown>> = [];
  await page.route('http://localhost:3000/api/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (pathname === '/api/auth/session') {
      await json(route, sessionUser);
      return;
    }
    if (pathname === '/api/trading/trades' && request.method() === 'GET') {
      await json(route, {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
        trades: [sampleTrade],
      });
      return;
    }
    if (pathname === '/api/trading/trades/trade-1') {
      if (request.method() === 'PATCH') {
        patchBodies.push(request.postDataJSON());
        await json(route, { ...sampleTrade, entryPrice: '1.5', version: 5 });
        return;
      }
      await json(route, sampleTrade);
      return;
    }
    if (pathname === '/api/trading/options') {
      await json(route, {
        options: [],
        settings: { defaultUsdtCnyRate: '7.2' },
      });
      return;
    }
    await json(route, { detail: `Unhandled test endpoint: ${pathname}` }, 404);
  });
  return { patchBodies };
}

// 回归场景：深链接进入交易详情抽屉后点击「编辑」。
// 布局以 fullPath 作为页面组件 key 时，移除 tradeId 的 query 变化会重挂载
// 整个页面并丢失弹窗状态，导致「点击编辑只是跳回列表页」。
test('deep-linked trade drawer edit opens the prefilled edit modal and saves via PATCH', async ({
  page,
}) => {
  // 仅在桌面项目上运行（两个项目的 browserName 均为 chromium）。
  test.skip(test.info().project.name !== 'chromium', '桌面端交互流程');

  const { patchBodies } = await mockTradingCloud(page);

  // 与用户上报的入口一致：直接打开带 tradeId 的深链接。
  await page.goto('/trading/trades?tradeId=trade-1');

  // 抽屉打开并展示这笔交易。
  await expect(page.locator('.ant-drawer')).toBeVisible();
  await expect(page.locator('.ant-drawer-title')).toContainText('MU');

  // 点击抽屉的「编辑」按钮。
  await page
    .locator('.ant-drawer-extra button', { hasText: '编辑' })
    .click();

  // 关键断言：编辑弹窗必须真正打开并预填数据，而不是仅跳回列表页。
  await expect(page.locator('.ant-modal-title')).toHaveText('编辑交易记录');
  await expect(page).toHaveURL(/\/trading\/trades$/);

  const comboboxValues = await page
    .locator('.ant-modal .ant-select-selection-search-input')
    .evaluateAll((inputs) =>
      (inputs as Array<HTMLInputElement>).map((input) => input.value),
    );
  expect(comboboxValues).toContain('MU');
  expect(comboboxValues).toContain('趋势突破');

  // 修改开仓价后保存，断言 PATCH payload 只含后端允许的字段。
  await page
    .locator('.ant-modal .ant-form-item', { hasText: '开仓价' })
    .locator('input.ant-input')
    .fill('1.5');
  await page.getByRole('button', { name: /保存交易/ }).click();

  await expect(page.locator('.ant-modal-title')).toBeHidden();
  expect(patchBodies).toHaveLength(1);
  expect(patchBodies[0]).toMatchObject({
    symbol: 'MU',
    entryPrice: '1.5',
    version: 4,
  });
  const forbiddenKeys = Object.keys(patchBodies[0]).filter((key) =>
    FORBIDDEN_TRADE_INPUT_KEYS.includes(key),
  );
  expect(forbiddenKeys).toEqual([]);
});
