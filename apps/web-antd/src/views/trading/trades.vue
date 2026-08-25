<script lang="ts" setup>
import type { TradeListFilters, TradeListResponse, TradeView } from '#/shared/types/trading';

import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { DownloadOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  Pagination,
  Select,
  Skeleton,
  Tag,
} from 'ant-design-vue';

import { exportUrl, getTrade, isCanceledRequest, listTrades } from '#/api';
import PageFrame from '#/components/page-frame.vue';
import TradeDetailDrawer from '#/components/trade-detail-drawer.vue';
import TradeFormModal from '#/components/trade-form-modal.vue';
import {
  errorMessage,
  formatMoney,
  formatTradingDate,
  marketLabel,
  sideLabel,
  statusLabel,
} from '#/lib/trading';
import { getDefaultTradingDateRange } from '#/shared/trading-date-range';

const route = useRoute();
const router = useRouter();
const defaults = getDefaultTradingDateRange();
const filters = reactive({
  from: typeof route.query.from === 'string' ? route.query.from : defaults.from,
  grade: typeof route.query.grade === 'string' ? route.query.grade : '',
  outcome: typeof route.query.outcome === 'string' ? route.query.outcome : '',
  query: typeof route.query.q === 'string' ? route.query.q : '',
  status: typeof route.query.status === 'string' ? route.query.status : '',
  to: typeof route.query.to === 'string' ? route.query.to : defaults.to,
});
const searchInput = ref(filters.query);
const page = ref(typeof route.query.page === 'string' ? Math.max(1, Number(route.query.page) || 1) : 1);
const pageSize = ref(50);
const data = ref<null | TradeListResponse>(null);
const loading = ref(true);
const failure = ref('');
const formOpen = ref(false);
const selectedTrade = ref<null | TradeView>(null);
const editingTrade = ref<null | TradeView>(null);
const cloneSource = ref<null | TradeView>(null);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let requestId = 0;
let loadController: AbortController | undefined;

function requestFilters(): TradeListFilters {
  return {
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    outcome: filters.outcome === 'win' || filters.outcome === 'loss' ? filters.outcome : undefined,
    page: page.value,
    pageSize: pageSize.value,
  };
}

const downloadUrl = computed(() => exportUrl({
  from: filters.from || undefined,
  to: filters.to || undefined,
  grade: filters.grade || undefined,
  outcome: filters.outcome === 'win' || filters.outcome === 'loss' ? filters.outcome : undefined,
  query: filters.query || undefined,
  status: filters.status || undefined,
}));

async function load() {
  const id = ++requestId;
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  loading.value = true;
  failure.value = '';
  try {
    const result = await listTrades(requestFilters(), controller.signal);
    if (id === requestId) data.value = result;
  } catch (error) {
    if (id === requestId && !isCanceledRequest(error)) {
      failure.value = errorMessage(error);
    }
  } finally {
    if (id === requestId) {
      loadController = undefined;
      loading.value = false;
    }
  }
}

watch(searchInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => (filters.query = value), 300);
});
watch(
  filters,
  () => {
    page.value = 1;
    void load();
  },
  { deep: true },
);
watch([() => ({ ...filters }), page], () => {
  void router.replace({
    query: {
      from: filters.from || undefined,
      grade: filters.grade || undefined,
      outcome: filters.outcome || undefined,
      page: page.value > 1 ? String(page.value) : undefined,
      q: filters.query || undefined,
      status: filters.status || undefined,
      to: filters.to || undefined,
      tradeId: selectedTrade.value?.id || undefined,
    },
  });
}, { deep: true });
watch(page, load);
watch(
  () => route.query.tradeId,
  async (id) => {
    if (typeof id !== 'string') {
      selectedTrade.value = null;
      return;
    }
    if (selectedTrade.value?.id === id) return;
    try {
      selectedTrade.value = await getTrade(id);
    } catch {
      selectedTrade.value = null;
    }
  },
  { immediate: true },
);

function selectTrade(trade: null | TradeView) {
  selectedTrade.value = trade;
  void router.replace({ query: { ...route.query, tradeId: trade?.id || undefined } });
}
function newTrade() {
  editingTrade.value = null;
  cloneSource.value = null;
  formOpen.value = true;
}
function editTrade(trade: TradeView) {
  selectTrade(null);
  editingTrade.value = trade;
  cloneSource.value = null;
  formOpen.value = true;
}
function cloneTrade(trade: TradeView) {
  selectTrade(null);
  editingTrade.value = null;
  cloneSource.value = trade;
  formOpen.value = true;
}
function clearFilters() {
  const range = getDefaultTradingDateRange();
  Object.assign(filters, { ...range, grade: '', outcome: '', query: '', status: '' });
  searchInput.value = '';
  page.value = 1;
}
async function reload() {
  await load();
  if (selectedTrade.value) selectedTrade.value = await getTrade(selectedTrade.value.id);
}

onMounted(load);
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
  loadController?.abort();
});
</script>

<template>
  <div class="view-root">
    <PageFrame kicker="TRADE LEDGER" title="交易记录" subtitle="按日期、状态和执行质量定位真正影响结果的交易。">
    <template #actions><Button type="primary" @click="newTrade"><PlusOutlined />记录交易</Button></template>

    <section class="market-panel ledger-filters">
      <Input v-model:value="searchInput" allow-clear placeholder="搜索标的或代码" aria-label="搜索标的或代码"><template #prefix><SearchOutlined /></template></Input>
      <DatePicker v-model:value="filters.from" value-format="YYYY-MM-DD" aria-label="开始日期" />
      <DatePicker v-model:value="filters.to" value-format="YYYY-MM-DD" aria-label="结束日期" />
      <Select v-model:value="filters.status" :options="[{ label: '全部状态', value: '' }, { label: '已平仓', value: 'closed' }, { label: '未平仓', value: 'open' }]" />
      <Select v-model:value="filters.grade" :options="[{ label: '全部评分', value: '' }, ...['A', 'B', 'C'].map((value) => ({ label: value, value }))]" />
      <Select v-model:value="filters.outcome" :options="[{ label: '全部结果', value: '' }, { label: '盈利', value: 'win' }, { label: '亏损', value: 'loss' }]" />
      <Button @click="clearFilters">重置</Button>
      <Button type="primary" :href="downloadUrl"><DownloadOutlined />导出 Excel</Button>
    </section>

    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <Alert v-else-if="failure" type="error" show-icon :message="failure" />
    <section v-else class="market-panel ledger-panel">
      <div class="ledger-summary"><strong>{{ data?.total ?? 0 }}</strong><span>笔匹配交易</span></div>
      <div class="ledger-table-wrap">
        <table class="ledger-table">
          <thead><tr><th>日期</th><th>标的</th><th>市场 / 方向</th><th>策略</th><th>状态</th><th>执行</th><th>净盈亏</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>
            <tr v-for="trade in data?.trades" :key="trade.id">
              <td><button type="button" class="table-link" @click="selectTrade(trade)">{{ formatTradingDate(trade.tradeDate, true) }}</button></td>
              <td><button type="button" class="symbol-link" @click="selectTrade(trade)"><b>{{ trade.symbol }}</b><small>{{ trade.instrumentCode || '—' }}</small></button></td>
              <td>{{ marketLabel(trade.market) }} · {{ sideLabel(trade.side) }}</td>
              <td>{{ trade.strategy }}<small class="cell-subtitle">{{ trade.timeframe }}</small></td>
              <td><Tag :color="trade.status === 'closed' ? 'green' : 'gold'">{{ statusLabel(trade.status) }}</Tag></td>
              <td>{{ trade.executionGrade ?? '—' }}</td>
              <td><strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong></td>
              <td><Button size="small" @click="cloneTrade(trade)">复制</Button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Empty v-if="!data?.trades.length" description="没有匹配的交易记录" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      <Pagination v-if="data && data.totalPages > 1" v-model:current="page" :page-size="data.pageSize" :total="data.total" :show-size-changer="false" show-less-items />
    </section>
    </PageFrame>

    <TradeFormModal :open="formOpen" :trade="editingTrade" :clone-source="cloneSource" @close="formOpen = false" @saved="reload" />
    <TradeDetailDrawer :trade="selectedTrade" @close="selectTrade(null)" @edit="editTrade" @deleted="reload" @refresh="load" @updated="selectedTrade = $event" />
  </div>
</template>
