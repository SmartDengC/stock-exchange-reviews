<script setup lang="ts">
import type { TradeView, TradingDashboard } from "~~/shared/types/trading";
import { formatMoney, formatNumber, formatPercent, marketLabel, sideLabel } from "~/lib/trading";

definePageMeta({ middleware: "trading-auth" });
useSeoMeta({ title: "交易总览 · 私有交易复盘", robots: "noindex, nofollow" });

const from = ref("");
const to = ref("");
const formOpen = ref(false);
const selectedTrade = ref<TradeView | null>(null);
const editingTrade = ref<TradeView | null>(null);
const cloneSource = ref<TradeView | null>(null);

const { data, pending, error, refresh } = await useFetch<TradingDashboard>("/api/trading/dashboard", {
  query: computed(() => ({ from: from.value || undefined, to: to.value || undefined })),
});

const maxDaily = computed(() => Math.max(1, ...((data.value?.dailyPnl ?? []).map((item) => Math.abs(Number(item.pnlCny))))));
const cumulativeSeries = computed(() => {
  let total = 0;
  return (data.value?.dailyPnl ?? []).map((item) => {
    total += Number(item.pnlCny);
    return { ...item, cumulative: total };
  });
});
const cumulativePolyline = computed(() => {
  const series = cumulativeSeries.value;
  if (!series.length) return "";
  const values = series.map((item) => item.cumulative);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = Math.max(1, max - min);
  return series.map((item, index) => {
    const x = series.length === 1 ? 500 : index / (series.length - 1) * 1000;
    const y = 190 - (item.cumulative - min) / range * 160;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
});
const cumulativeZeroY = computed(() => {
  const values = cumulativeSeries.value.map((item) => item.cumulative);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  return 190 - (0 - min) / Math.max(1, max - min) * 160;
});

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

async function reloadData() {
  await refresh();
}
</script>

<template>
  <div class="trading-page-root">
    <TradingShell eyebrow="PRIVATE OVERVIEW" title="交易总览" subtitle="收益结果与执行纪律放在同一张桌面上。">
    <template #actions>
      <button type="button" class="trading-primary-button" @click="newTrade">＋ 记录交易</button>
    </template>

    <section class="trading-filter-strip">
      <label>开始日期<input v-model="from" type="date"></label>
      <label>结束日期<input v-model="to" type="date"></label>
      <button v-if="from || to" type="button" @click="from = ''; to = ''">查看全部</button>
      <span>统计仅纳入已平仓交易</span>
    </section>

    <div v-if="pending" class="trading-loading">正在载入交易数据…</div>
    <div v-else-if="error" class="trading-error">{{ error.message || "交易数据库暂不可用" }}</div>
    <template v-else-if="data">
      <section class="trading-kpi-grid">
        <article class="trading-kpi trading-kpi-primary">
          <span>净盈亏（元）</span>
          <strong :class="{ positive: Number(data.metrics.netPnlCny) > 0, negative: Number(data.metrics.netPnlCny) < 0 }">{{ formatMoney(data.metrics.netPnlCny) }}</strong>
          <small>{{ data.metrics.closedTrades }} 笔已平仓</small>
        </article>
        <article class="trading-kpi"><span>胜率</span><strong>{{ formatPercent(data.metrics.winRate) }}</strong><small>{{ data.metrics.openTrades }} 笔待平仓</small></article>
        <article class="trading-kpi"><span>累计 R 倍</span><strong>{{ data.metrics.totalR ? `${formatNumber(data.metrics.totalR)}R` : "—" }}</strong><small>仅统计填写计划风险的交易</small></article>
        <article class="trading-kpi"><span>平均盈亏</span><strong>{{ formatMoney(data.metrics.averagePnlCny) }}</strong><small>单笔人民币口径</small></article>
        <article class="trading-kpi"><span>A 级执行</span><strong>{{ formatPercent(data.metrics.gradeARate) }}</strong><small>完全按计划交易</small></article>
        <article class="trading-kpi"><span>Profit Factor</span><strong>{{ formatNumber(data.metrics.profitFactor) }}</strong><small>总盈利 / 总亏损</small></article>
      </section>

      <section class="trading-dashboard-grid">
        <article class="trading-panel trading-pnl-panel">
          <header><div><span class="eyebrow">EQUITY CURVE</span><h2>累计盈亏曲线</h2></div><small>{{ data.dailyPnl.length }} 个交易日</small></header>
          <div v-if="data.dailyPnl.length" class="equity-chart">
            <svg viewBox="0 0 1000 220" role="img" aria-label="累计人民币盈亏曲线" preserveAspectRatio="none">
              <line x1="0" x2="1000" :y1="cumulativeZeroY" :y2="cumulativeZeroY" />
              <polyline :points="cumulativePolyline" />
            </svg>
            <div><span>{{ cumulativeSeries[0]?.date }}</span><strong>{{ formatMoney(cumulativeSeries.at(-1)?.cumulative) }}</strong><span>{{ cumulativeSeries.at(-1)?.date }}</span></div>
          </div>
          <p v-else class="trading-empty">完成第一笔交易后，这里会显示累计收益路径。</p>
        </article>

        <article class="trading-panel trading-calendar-panel">
          <header><div><span class="eyebrow">P&L CALENDAR</span><h2>每日盈亏日历</h2></div><small>最近 30 个交易日</small></header>
          <div v-if="data.dailyPnl.length" class="pnl-calendar">
            <div
              v-for="item in data.dailyPnl.slice(-30)"
              :key="item.date"
              :class="{ positive: Number(item.pnlCny) >= 0, negative: Number(item.pnlCny) < 0 }"
              :style="{ '--pnl-strength': Math.max(0.14, Math.abs(Number(item.pnlCny)) / maxDaily) }"
              :title="`${item.date} · ${formatMoney(item.pnlCny)}`"
            >
              <span>{{ item.date.slice(5) }}</span><b>{{ formatMoney(item.pnlCny) }}</b><small>{{ item.count }} 笔</small>
            </div>
          </div>
          <p v-else class="trading-empty">暂无可展示的交易日。</p>
        </article>

        <article class="trading-panel">
          <header><div><span class="eyebrow">MARKET SPLIT</span><h2>市场表现</h2></div></header>
          <div class="breakdown-list">
            <div v-for="item in data.byMarket" :key="item.label">
              <span>{{ item.label }}<small>{{ item.count }} 笔 · 胜率 {{ formatPercent(item.winRate) }}</small></span>
              <b :class="{ positive: Number(item.pnlCny) >= 0, negative: Number(item.pnlCny) < 0 }">{{ formatMoney(item.pnlCny) }}</b>
            </div>
            <p v-if="!data.byMarket.length" class="trading-empty">暂无已平仓交易。</p>
          </div>
        </article>

        <article class="trading-panel">
          <header><div><span class="eyebrow">BEHAVIOR</span><h2>高频错误</h2></div><NuxtLink to="/trading/analytics">查看分析 →</NuxtLink></header>
          <div class="rank-list">
            <div v-for="(item, index) in data.errorTagDistribution.slice(0, 6)" :key="item.label">
              <span>{{ String(index + 1).padStart(2, "0") }}</span><b>{{ item.label }}</b><i :style="{ width: `${Math.max(12, item.count / (data.errorTagDistribution[0]?.count || 1) * 100)}%` }" /><em>{{ item.count }}</em>
            </div>
            <p v-if="!data.errorTagDistribution.length" class="trading-empty">尚未记录错误标签。</p>
          </div>
        </article>

        <article class="trading-panel">
          <header><div><span class="eyebrow">OPEN TRADES</span><h2>待平仓记录</h2></div><NuxtLink to="/trading/trades?status=open">全部 →</NuxtLink></header>
          <button v-for="trade in data.openTrades" :key="trade.id" type="button" class="recent-trade-row" @click="selectedTrade = trade">
            <span><b>{{ trade.symbol }}</b><small>{{ marketLabel(trade.market) }} · {{ sideLabel(trade.side) }} · {{ trade.strategy }}</small></span>
            <time>{{ trade.tradeDate }}</time>
          </button>
          <p v-if="!data.openTrades.length" class="trading-empty">没有待平仓记录。</p>
        </article>

        <article class="trading-panel trading-recent-panel">
          <header><div><span class="eyebrow">RECENT TRADES</span><h2>最近交易</h2></div><NuxtLink to="/trading/trades">交易台账 →</NuxtLink></header>
          <button v-for="trade in data.recentTrades" :key="trade.id" type="button" class="recent-trade-row" @click="selectedTrade = trade">
            <span><b>{{ trade.symbol }}</b><small>{{ trade.tradeDate }} · {{ trade.strategy }} · {{ trade.executionGrade ?? "未评分" }}</small></span>
            <strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong>
          </button>
          <p v-if="!data.recentTrades.length" class="trading-empty">还没有交易记录。</p>
        </article>

        <article class="trading-panel">
          <header><div><span class="eyebrow">REVIEW QUEUE</span><h2>待完成日复盘</h2></div></header>
          <div class="review-date-list">
            <NuxtLink v-for="date in data.pendingDailyReviews" :key="date" :to="`/trading/daily/${date}`"><span>{{ date }}</span><b>完成复盘 →</b></NuxtLink>
            <p v-if="!data.pendingDailyReviews.length" class="trading-empty">已有交易日都完成了日复盘。</p>
          </div>
        </article>
      </section>
    </template>
    </TradingShell>

    <TradeFormModal :open="formOpen" :trade="editingTrade" :clone-source="cloneSource" @close="formOpen = false" @saved="reloadData" />
    <TradeDetailModal :trade="selectedTrade" @close="selectedTrade = null" @edit="editTrade" @clone="cloneTrade" @deleted="reloadData" @refresh="reloadData" @updated="selectedTrade = $event" />
  </div>
</template>
