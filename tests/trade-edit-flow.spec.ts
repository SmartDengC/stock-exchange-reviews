import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TradeFormModal from '#/components/trade-form-modal.vue';
import tradesView from '#/views/trading/trades.vue';

// 后端 TradeInput（extra="forbid"）允许的字段，PATCH payload 不得携带其它键。
const ALLOWED_TRADE_INPUT_KEYS = new Set([
  'didWell',
  'emotion',
  'entryAt',
  'entryPrice',
  'entryReason',
  'errorNotes',
  'errorTags',
  'executionGrade',
  'exitAt',
  'exitPrice',
  'exitReason',
  'fees',
  'fxToCny',
  'instrumentCode',
  'market',
  'nextImprovement',
  'plannedRiskAmount',
  'positionBasis',
  'positionSize',
  'settlementCurrency',
  'side',
  'status',
  'strategy',
  'symbol',
  'timeframe',
  'tradeDate',
  'version',
]);

const api = vi.hoisted(() => ({
  apiUrl: vi.fn((path: string) => `http://localhost:8000${path}`),
  createTrade: vi.fn(),
  deleteAttachment: vi.fn(),
  deleteTrade: vi.fn(),
  exportUrl: vi.fn(() => 'http://localhost:8000/api/trading/trades/export'),
  getTrade: vi.fn(),
  getTradingOptions: vi.fn(),
  isCanceledRequest: vi.fn(() => false),
  listTrades: vi.fn(),
  updateAttachment: vi.fn(),
  updateTrade: vi.fn(),
  uploadTradeAttachments: vi.fn(),
}));

vi.mock('#/api', () => api);

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

function clickElement(element: Element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

async function openEditModal() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ component: tradesView, path: '/trading/trades' }],
  });
  await router.push('/trading/trades');
  await router.isReady();
  const wrapper = mount(tradesView, { attachTo: document.body, global: { plugins: [router] } });
  await flushPromises();

  await wrapper.find('.symbol-link').trigger('click');
  await flushPromises();

  const editButton = document.body.querySelector('.ant-drawer-extra button');
  expect(editButton?.textContent).toContain('编辑');
  clickElement(editButton!);
  await flushPromises();
  return wrapper;
}

describe('trade detail drawer edit flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    api.listTrades.mockResolvedValue({
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
      trades: [sampleTrade],
    });
    api.getTradingOptions.mockResolvedValue({
      options: [],
      settings: { defaultUsdtCnyRate: '7.2' },
    });
  });

  it('opens the edit modal prefilled with the current trade when 编辑 is clicked', async () => {
    const wrapper = await openEditModal();

    const modal = wrapper.findComponent(TradeFormModal);
    expect(modal.props('open')).toBe(true);
    expect(modal.props('trade')).toMatchObject({ id: 'trade-1', symbol: 'MU' });
    expect(document.body.querySelector('.ant-modal-title')?.textContent).toBe('编辑交易记录');

    const comboboxInputs = [
      ...document.body.querySelectorAll<HTMLInputElement>(
        '.ant-modal .ant-select-selection-search-input',
      ),
    ];
    const comboboxValues = comboboxInputs.map((input) => input.value);
    expect(comboboxValues).toContain('MUUSDT');
    expect(comboboxValues).toContain('MU');
    expect(comboboxValues).toContain('趋势突破');
    expect(comboboxValues).toContain('5 分');
    wrapper.unmount();
  });

  it('persists edits through updateTrade with only backend-allowed fields when 保存交易 is confirmed', async () => {
    const wrapper = await openEditModal();

    const priceInput = [
      ...document.body.querySelectorAll<HTMLInputElement>('.ant-modal input.ant-input'),
    ].find((input) => input.value === '1.2');
    expect(priceInput).toBeTruthy();
    priceInput!.value = '1.5';
    priceInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();

    api.updateTrade.mockResolvedValue({ ...sampleTrade, entryPrice: '1.5', version: 5 });
    const okButton = [...document.body.querySelectorAll('.ant-modal .ant-btn')].find((button) =>
      button.textContent?.includes('保存交易'),
    );
    clickElement(okButton!);
    await flushPromises();

    expect(api.updateTrade).toHaveBeenCalledTimes(1);
    expect(api.updateTrade).toHaveBeenCalledWith(
      'trade-1',
      expect.objectContaining({ symbol: 'MU', entryPrice: '1.5', version: 4 }),
    );
    expect(api.createTrade).not.toHaveBeenCalled();

    const payload = api.updateTrade.mock.calls[0][1] as Record<string, unknown>;
    const forbiddenKeys = Object.keys(payload).filter((key) => !ALLOWED_TRADE_INPUT_KEYS.has(key));
    expect(forbiddenKeys).toEqual([]);

    const modal = wrapper.findComponent(TradeFormModal);
    expect(modal.props('open')).toBe(false);
    expect(api.listTrades).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
