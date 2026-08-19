<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { getDefaultTradingDateRange } from "~~/shared/trading-date-range";
import type { TradeView, TradingOptionsResponse } from "~~/shared/types/trading";
import { formatMoney, marketLabel, sideLabel, statusLabel } from "~/lib/trading";

useSeoMeta({ title: "交易记录 · 私有交易复盘", robots: "noindex, nofollow" });

const route = useRoute();
const defaultDateRange = getDefaultTradingDateRange();

// 搜索输入防抖
const searchInput = ref("");
let searchTimeout: NodeJS.Timeout | null = null;

// 清理定时器
onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout);
});

const filters = reactive({
  from: defaultDateRange.from,
  to: defaultDateRange.to,
  market: "",
  status: typeof route.query.status === "string" ? route.query.status : "",
  side: "",
  strategy: "",
  timeframe: "",
  grade: "",
  emotion: "",
  errorTag: "",
  outcome: "",
  q: "",
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

// 分页状态
const currentPage = ref(1);
const pageSize = ref(50);

const { data, pending, error, refresh } = await useFetch<TradeListResponse>("/api/trading/trades", {
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

// 从字典表获取筛选选项，而不是从查询结果中提取
const options = ref<TradingOptionsResponse | null>(null);
onMounted(async () => {
  options.value = await $fetch<TradingOptionsResponse>("/api/trading/options").catch(() => null);
});

const strategies = computed(() => 
  options.value?.options.filter(item => item.kind === "strategy" && item.active).map(item => item.label) ?? []
);

const timeframes = computed(() => 
  options.value?.options.filter(item => item.kind === "timeframe" && item.active).map(item => item.label) ?? []
);

const emotions = computed(() => 
  options.value?.options.filter(item => item.kind === "emotion" && item.active).map(item => item.label) ?? []
);

const errorTags = computed(() => 
  options.value?.options.filter(item => item.kind === "error_tag" && item.active).map(item => item.label) ?? []
);

function newTrade() {
  editingTrade.value = null;
  cloneSource.value = null;
  formOpen.value = true;
}

function editTrade(trade: TradeView) {
  selectedTrade.value = null;
  editingTrade.value = trade;
  cloneSource.value = null;
  formOpen.value = true;
}

function cloneTrade(trade: TradeView) {
  selectedTrade.value = null;
  editingTrade.value = null;
  cloneSource.value = trade;
  formOpen.value = true;
}

function clearFilters() {
  const dateRange = getDefaultTradingDateRange();
  Object.assign(filters, { ...dateRange, market: "", status: "", side: "", strategy: "", timeframe: "", grade: "", emotion: "", errorTag: "", outcome: "", q: "" });
  currentPage.value = 1; // 重置到第一页
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
      <div class="trade-search-field"><span>⌕</span><input :value="searchInput" @input="(e) => searchInput = (e.target as HTMLInputElement).value" placeholder="搜索标的或代码" aria-label="搜索标的或代码"></div>
      <input v-model="filters.from" type="date" aria-label="开始日期">
      <input v-model="filters.to" type="date" aria-label="结束日期">
      <select v-model="filters.market" aria-label="筛选市场"><option value="">全部市场</option><option value="crypto">加密</option><option value="a_share">A 股</option></select>
      <select v-model="filters.status" aria-label="筛选状态"><option value="">全部状态</option><option value="closed">已平仓</option><option value="open">未平仓</option></select>
      <select v-model="filters.side" aria-label="筛选方向"><option value="">全部方向</option><option value="long">做多</option><option value="short">做空</option></select>
      <select v-model="filters.strategy" aria-label="筛选策略"><option value="">全部策略</option><option v-for="item in strategies" :key="item">{{ item }}</option></select>
      <select v-model="filters.timeframe" aria-label="筛选周期"><option value="">全部周期</option><option v-for="item in timeframes" :key="item">{{ item }}</option></select>
      <select v-model="filters.grade" aria-label="筛选评分"><option value="">全部评分</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
      <select v-model="filters.emotion" aria-label="筛选情绪"><option value="">全部情绪</option><option v-for="item in emotions" :key="item">{{ item }}</option></select>
      <select v-model="filters.errorTag" aria-label="筛选错误标签"><option value="">全部错误标签</option><option v-for="item in errorTags" :key="item">{{ item }}</option></select>
      <select v-model="filters.outcome" aria-label="筛选结果"><option value="">全部结果</option><option value="win">盈利</option><option value="loss">亏损</option></select>
      <button type="button" @click="clearFilters" aria-label="重置筛选条件">重置</button>
    </section>

    <div v-if="pending" class="trading-loading">正在筛选交易…</div>
    <div v-else-if="error" class="trading-error">{{ error.message || "读取交易失败" }}</div>
    <section v-else class="trade-ledger-panel">
      <header>
        <span>共 {{ data?.total ?? 0 }} 笔，第 {{ data?.page ?? 1 }} / {{ data?.totalPages ?? 1 }} 页</span>
        <small>点击任意记录查看完整复盘</small>
      </header>
      <div class="trade-table-wrap">
        <table class="trade-table">
          <thead><tr><th>日期</th><th>标的</th><th>市场 / 方向</th><th>策略</th><th>状态</th><th>执行</th><th>净盈亏（元）</th><th>截图</th></tr></thead>
          <tbody>
            <tr v-for="trade in data?.trades" :key="trade.id" tabindex="0" @click="selectedTrade = trade" @keydown.enter="selectedTrade = trade">
              <td>{{ trade.tradeDate }}</td>
              <td><b>{{ trade.symbol }}</b><small>{{ trade.instrumentCode || "—" }}</small></td>
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
        <button v-for="trade in data?.trades" :key="trade.id" type="button" @click="selectedTrade = trade">
          <span><b>{{ trade.symbol }}</b><small>{{ trade.tradeDate }} · {{ marketLabel(trade.market) }} · {{ trade.strategy }}</small></span>
          <strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong>
        </button>
      </div>
      <p v-if="!data?.trades.length" class="trading-empty">没有符合当前筛选条件的交易。</p>
      
      <!-- 分页控件 -->
      <nav v-if="data?.totalPages && data.totalPages > 1" class="trading-pagination" aria-label="交易记录分页">
        <button 
          type="button" 
          :disabled="currentPage <= 1" 
          @click="goToPage(currentPage - 1)"
          aria-label="上一页"
        >
          ← 上一页
        </button>
        <span class="pagination-info">
          第 {{ currentPage }} / {{ data.totalPages }} 页
        </span>
        <button 
          type="button" 
          :disabled="currentPage >= data.totalPages" 
          @click="goToPage(currentPage + 1)"
          aria-label="下一页"
        >
          下一页 →
        </button>
      </nav>
    </section>
    </TradingShell>

    <TradeFormModal :open="formOpen" :trade="editingTrade" :clone-source="cloneSource" @close="formOpen = false" @saved="reloadData" />
    <TradeDetailModal :trade="selectedTrade" @close="selectedTrade = null" @edit="editTrade" @clone="cloneTrade" @deleted="reloadData" @refresh="reloadData" @updated="selectedTrade = $event" />
  </div>
</template>
