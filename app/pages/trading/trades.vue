<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { getDefaultTradingDateRange } from "~~/shared/trading-date-range";
import type { TradeView } from "~~/shared/types/trading";
import { formatMoney, formatTradingDate, marketLabel, sideLabel, statusLabel } from "~/lib/trading";

useSeoMeta({ title: "交易记录 · 私有交易复盘", robots: "noindex, nofollow" });

const route = useRoute();
const router = useRouter();
const { $api } = useNuxtApp();
const defaultDateRange = getDefaultTradingDateRange();

// 搜索输入防抖
const searchInput = ref(typeof route.query.q === "string" ? route.query.q : "");
let searchTimeout: NodeJS.Timeout | null = null;

// 清理定时器
onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout);
});

const filters = reactive({
  from: typeof route.query.from === "string" ? route.query.from : defaultDateRange.from,
  to: typeof route.query.to === "string" ? route.query.to : defaultDateRange.to,
  status: typeof route.query.status === "string" ? route.query.status : "",
  grade: typeof route.query.grade === "string" ? route.query.grade : "",
  outcome: typeof route.query.outcome === "string" ? route.query.outcome : "",
  q: typeof route.query.q === "string" ? route.query.q : "",
});

// 防抖更新搜索关键词
watch(searchInput, (value) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    filters.q = value;
  }, 300); // 300ms 防抖
});

const formOpen = ref(false);
const selectedTrade = ref<TradeView | null>(null);
const editingTrade = ref<TradeView | null>(null);
const cloneSource = ref<TradeView | null>(null);
const activeTradeId = ref(typeof route.query.tradeId === "string" ? route.query.tradeId : "");

// 分页状态
const currentPage = ref(typeof route.query.page === "string" ? Math.max(1, Number(route.query.page) || 1) : 1);
const pageSize = ref(50);

const { data, pending, error, refresh } = useFetch<TradeListResponse>("/api/trading/trades", {
  $fetch: $api,
  lazy: true,
  server: false,
  query: computed(() => {
    const params: Record<string, unknown> = {
      page: currentPage.value,
      pageSize: pageSize.value,
      ...Object.fromEntries(Object.entries(filters).filter(([key, value]) => key !== 'q' && value)),
    };
    if (filters.q) params.q = filters.q;
    return params;
  }),
});

const urlQuery = computed(() => ({
  from: filters.from || undefined,
  to: filters.to || undefined,
  status: filters.status || undefined,
  grade: filters.grade || undefined,
  outcome: filters.outcome || undefined,
  q: filters.q || undefined,
  page: currentPage.value > 1 ? String(currentPage.value) : undefined,
  tradeId: activeTradeId.value || undefined,
}));

watch(urlQuery, (query) => router.replace({ query }), { deep: true });

watch(() => route.query.tradeId, async (tradeId) => {
  activeTradeId.value = typeof tradeId === "string" ? tradeId : "";
  if (typeof tradeId !== "string") {
    selectedTrade.value = null;
    return;
  }
  if (selectedTrade.value?.id === tradeId) return;
  selectedTrade.value = await $api<TradeView>(`/api/trading/trades/${tradeId}`).catch(() => null);
}, { immediate: true });

function selectTrade(trade: TradeView | null) {
  selectedTrade.value = trade;
  activeTradeId.value = trade?.id ?? "";
  router.replace({ query: { ...urlQuery.value, tradeId: trade?.id || undefined } });
}

function newTrade() {
  editingTrade.value = null;
  cloneSource.value = null;
  formOpen.value = true;
}

function editTrade(trade: TradeView) {
  selectTrade(null);
  editingTrade.value = trade;
  formOpen.value = true;
}

function clearFilters() {
  const dateRange = getDefaultTradingDateRange();
  Object.assign(filters, { ...dateRange, status: "", grade: "", outcome: "", q: "" });
  searchInput.value = "";
  currentPage.value = 1;
}

async function reloadData() {
  currentPage.value = 1;
  await refresh();
}

function goToPage(page: number) {
  const totalPages = data.value?.totalPages ?? 1;
  if (page < 1 || page > totalPages) return;
  currentPage.value = page;
}
</script>

<template>
  <div class="trading-page-root">
    <TradingShell eyebrow="TRADE LEDGER" title="交易记录" subtitle="按市场、策略和行为标签找到真正影响结果的交易。">
    <template #actions><button type="button" class="trading-primary-button" @click="newTrade">＋ 记录交易</button></template>

    <section class="trade-filter-panel">
      <div class="trade-search-field"><span aria-hidden="true">⌕</span><input :value="searchInput" name="q" type="search" autocomplete="off" placeholder="例：MUUSDT…" aria-label="搜索标的或代码" @input="(e) => searchInput = (e.target as HTMLInputElement).value"></div>
      <input v-model="filters.from" name="from" type="date" autocomplete="off" aria-label="开始日期">
      <input v-model="filters.to" name="to" type="date" autocomplete="off" aria-label="结束日期">
      <select v-model="filters.status" name="status" autocomplete="off" aria-label="筛选状态"><option value="">全部状态</option><option value="closed">已平仓</option><option value="open">未平仓</option></select>
      <select v-model="filters.grade" name="grade" autocomplete="off" aria-label="筛选评分"><option value="">全部评分</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
      <select v-model="filters.outcome" name="outcome" autocomplete="off" aria-label="筛选结果"><option value="">全部结果</option><option value="win">盈利</option><option value="loss">亏损</option></select>
      <button type="button" aria-label="重置筛选条件" @click="clearFilters">重置</button>
    </section>

    <div v-if="pending" class="trading-loading" role="status" aria-live="polite">正在筛选交易…</div>
    <div v-else-if="error" class="trading-error" role="alert" aria-live="polite">{{ error.message || "读取交易失败，请刷新页面后重试" }}</div>
    <section v-else class="trade-ledger-panel">
      <header>
        <span>共 {{ data?.total ?? 0 }} 笔，第 {{ data?.page ?? 1 }} / {{ data?.totalPages ?? 1 }} 页</span>
        <small>选择标的查看完整复盘</small>
      </header>
      <div class="trade-table-wrap">
        <table class="trade-table">
          <thead><tr><th>日期</th><th>标的</th><th>市场 / 方向</th><th>策略</th><th>状态</th><th>执行</th><th>净盈亏（元）</th><th>截图</th></tr></thead>
          <tbody>
            <tr v-for="trade in data?.trades" :key="trade.id">
              <td><time :datetime="trade.tradeDate">{{ formatTradingDate(trade.tradeDate) }}</time></td>
              <td><button type="button" class="trade-row-button" @click="selectTrade(trade)"><b>{{ trade.symbol }}</b><small>{{ trade.instrumentCode || "—" }}</small></button></td>
              <td><b>{{ marketLabel(trade.market) }}</b><small>{{ sideLabel(trade.side) }} · {{ trade.timeframe }}</small></td>
              <td>{{ trade.strategy }}</td>
              <td><span :class="`trade-status-pill status-${trade.status}`">{{ statusLabel(trade.status) }}</span></td>
              <td><b>{{ trade.executionGrade ?? "—" }}</b><small>{{ trade.emotion ?? "未记录情绪" }}</small></td>
              <td><strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong></td>
              <td>{{ trade.attachments.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="trade-mobile-list">
        <button v-for="trade in data?.trades" :key="trade.id" type="button" @click="selectTrade(trade)">
          <span><b>{{ trade.symbol }}</b><small>{{ formatTradingDate(trade.tradeDate) }} · {{ marketLabel(trade.market) }} · {{ trade.strategy }}</small></span>
          <strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong>
        </button>
      </div>
      <p v-if="!data?.trades.length" class="trading-empty">没有符合当前筛选条件的交易。</p>
      
      <!-- 分页控件 -->
      <nav v-if="data?.totalPages && data.totalPages > 1" class="trading-pagination" aria-label="交易记录分页">
        <button 
          type="button" 
          :disabled="currentPage <= 1" 
          aria-label="上一页"
          @click="goToPage(currentPage - 1)"
        >
          ← 上一页
        </button>
        <span class="pagination-info">
          第 {{ currentPage }} / {{ data.totalPages }} 页
        </span>
        <button 
          type="button" 
          :disabled="currentPage >= data.totalPages" 
          aria-label="下一页"
          @click="goToPage(currentPage + 1)"
        >
          下一页 →
        </button>
      </nav>
    </section>
    </TradingShell>

    <TradeFormModal :open="formOpen" :trade="editingTrade" :clone-source="cloneSource" @close="formOpen = false" @saved="reloadData" />
    <TradeDetailModal :trade="selectedTrade" @close="selectTrade(null)" @edit="editTrade" @deleted="reloadData" @refresh="reloadData" @updated="selectedTrade = $event" />
  </div>
</template>
