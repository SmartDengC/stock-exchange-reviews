<script setup lang="ts">
import type { TradeView } from "~~/shared/types/trading";
import { formatMoney, marketLabel, sideLabel, statusLabel } from "~/lib/trading";

definePageMeta({ middleware: "trading-auth" });
useSeoMeta({ title: "交易记录 · 私有交易复盘", robots: "noindex, nofollow" });

const route = useRoute();
const filters = reactive({
  from: "",
  to: "",
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
const formOpen = ref(false);
const selectedTrade = ref<TradeView | null>(null);
const editingTrade = ref<TradeView | null>(null);
const cloneSource = ref<TradeView | null>(null);

const { data, pending, error, refresh } = await useFetch<{ trades: TradeView[] }>("/api/trading/trades", {
  query: computed(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value))),
});

const strategies = computed(() => [...new Set(data.value?.trades.map((trade) => trade.strategy) ?? [])]);
const timeframes = computed(() => [...new Set(data.value?.trades.map((trade) => trade.timeframe) ?? [])]);
const emotions = computed(() => [...new Set((data.value?.trades ?? []).map((trade) => trade.emotion).filter((emotion): emotion is string => Boolean(emotion)))]);
const errorTags = computed(() => [...new Set((data.value?.trades ?? []).flatMap((trade) => trade.errorTags ?? []))]);

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
  Object.assign(filters, { from: "", to: "", market: "", status: "", side: "", strategy: "", timeframe: "", grade: "", emotion: "", errorTag: "", outcome: "", q: "" });
}

async function reloadData() {
  await refresh();
}
</script>

<template>
  <div class="trading-page-root">
    <TradingShell eyebrow="TRADE LEDGER" title="交易记录" subtitle="按市场、策略和行为标签找到真正影响结果的交易。">
    <template #actions><button type="button" class="trading-primary-button" @click="newTrade">＋ 记录交易</button></template>

    <section class="trade-filter-panel">
      <div class="trade-search-field"><span>⌕</span><input v-model="filters.q" placeholder="搜索标的或代码"></div>
      <input v-model="filters.from" type="date" aria-label="开始日期">
      <input v-model="filters.to" type="date" aria-label="结束日期">
      <select v-model="filters.market"><option value="">全部市场</option><option value="crypto">加密</option><option value="a_share">A股</option></select>
      <select v-model="filters.status"><option value="">全部状态</option><option value="closed">已平仓</option><option value="open">未平仓</option></select>
      <select v-model="filters.side"><option value="">全部方向</option><option value="long">做多</option><option value="short">做空</option></select>
      <select v-model="filters.strategy"><option value="">全部策略</option><option v-for="item in strategies" :key="item">{{ item }}</option></select>
      <select v-model="filters.timeframe"><option value="">全部周期</option><option v-for="item in timeframes" :key="item">{{ item }}</option></select>
      <select v-model="filters.grade"><option value="">全部评分</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
      <select v-model="filters.emotion"><option value="">全部情绪</option><option v-for="item in emotions" :key="item">{{ item }}</option></select>
      <select v-model="filters.errorTag"><option value="">全部错误标签</option><option v-for="item in errorTags" :key="item">{{ item }}</option></select>
      <select v-model="filters.outcome"><option value="">全部结果</option><option value="win">盈利</option><option value="loss">亏损</option></select>
      <button type="button" @click="clearFilters">重置</button>
    </section>

    <div v-if="pending" class="trading-loading">正在筛选交易…</div>
    <div v-else-if="error" class="trading-error">{{ error.message || "读取交易失败" }}</div>
    <section v-else class="trade-ledger-panel">
      <header><span>共 {{ data?.trades.length ?? 0 }} 笔</span><small>点击任意记录查看完整复盘</small></header>
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
    </section>
    </TradingShell>

    <TradeFormModal :open="formOpen" :trade="editingTrade" :clone-source="cloneSource" @close="formOpen = false" @saved="reloadData" />
    <TradeDetailModal :trade="selectedTrade" @close="selectedTrade = null" @edit="editTrade" @clone="cloneTrade" @deleted="reloadData" @refresh="reloadData" @updated="selectedTrade = $event" />
  </div>
</template>
