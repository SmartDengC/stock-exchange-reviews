<script lang="ts" setup>
import type { TradeView, TradingDashboard } from '#/shared/types/trading';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import { Alert, Button, DatePicker, Empty, Skeleton, Tag } from 'ant-design-vue';

import { getTrade, getTradingDashboard, isCanceledRequest } from '#/api';
import PageFrame from '#/components/page-frame.vue';
import TradeDetailDrawer from '#/components/trade-detail-drawer.vue';
import TradeFormModal from '#/components/trade-form-modal.vue';
import {
  errorMessage,
  formatMoney,
  formatNumber,
  formatPercent,
  formatTradingDate,
  marketLabel,
  sideLabel,
} from '#/lib/trading';
import { getDefaultTradingDateRange } from '#/shared/trading-date-range';

const route = useRoute();
const router = useRouter();
const defaults = getDefaultTradingDateRange();
const from = ref(typeof route.query.from === 'string' ? route.query.from : defaults.from);
const to = ref(typeof route.query.to === 'string' ? route.query.to : defaults.to);
const loading = ref(true);
const failure = ref('');
const data = ref<null | TradingDashboard>(null);
const formOpen = ref(false);
const selectedTrade = ref<null | TradeView>(null);
const editingTrade = ref<null | TradeView>(null);
const cloneSource = ref<null | TradeView>(null);

let requestId = 0;
let loadController: AbortController | undefined;
async function load() {
  const id = ++requestId;
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  loading.value = true;
  failure.value = '';
  try {
    const result = await getTradingDashboard(
      { from: from.value || undefined, to: to.value || undefined },
      controller.signal,
    );
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

async function applyFilters() {
  await router.replace({ query: { ...route.query, from: from.value || undefined, to: to.value || undefined } });
  await load();
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

const maxDaily = computed(() => Math.max(1, ...(data.value?.dailyPnl ?? []).map((item) => Math.abs(Number(item.pnlCny)))));
const cumulativeSeries = computed(() => {
  let total = 0;
  return (data.value?.dailyPnl ?? []).map((item) => ({ ...item, cumulative: (total += Number(item.pnlCny)) }));
});
const cumulativePolyline = computed(() => {
  const series = cumulativeSeries.value;
  if (series.length === 0) return '';
  const values = series.map((item) => item.cumulative);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = Math.max(1, max - min);
  return series.map((item, index) => {
    const x = series.length === 1 ? 500 : (index / (series.length - 1)) * 1000;
    const y = 190 - ((item.cumulative - min) / range) * 160;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
});
const cumulativeZeroY = computed(() => {
  const values = cumulativeSeries.value.map((item) => item.cumulative);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  return 190 - ((0 - min) / Math.max(1, max - min)) * 160;
});

onMounted(load);
onBeforeUnmount(() => loadController?.abort());
</script>

<template>
  <div class="view-root">
    <PageFrame kicker="PRIVATE OVERVIEW" title="交易总览" subtitle="收益结果与执行纪律放在同一张桌面上。">
    <template #actions>
      <Button @click="load"><ReloadOutlined />刷新</Button>
      <Button type="primary" @click="newTrade"><PlusOutlined />记录交易</Button>
    </template>

    <section class="market-panel filter-strip">
      <label>开始日期<DatePicker v-model:value="from" value-format="YYYY-MM-DD" /></label>
      <label>结束日期<DatePicker v-model:value="to" value-format="YYYY-MM-DD" /></label>
      <Button @click="applyFilters">查询</Button>
      <span>统计仅纳入已平仓交易</span>
    </section>

    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <Alert v-else-if="failure" type="error" show-icon :message="failure" description="交易数据库暂不可用，请刷新后重试。" />
    <template v-else-if="data">
      <section class="metric-grid six">
        <article class="metric-card metric-primary"><span>净盈亏（元）</span><strong :class="{ positive: Number(data.metrics.netPnlCny) > 0, negative: Number(data.metrics.netPnlCny) < 0 }">{{ formatMoney(data.metrics.netPnlCny) }}</strong><small>{{ data.metrics.closedTrades }} 笔已平仓</small></article>
        <article class="metric-card"><span>胜率</span><strong>{{ formatPercent(data.metrics.winRate) }}</strong><small>{{ data.metrics.openTrades }} 笔待平仓</small></article>
        <article class="metric-card"><span>累计 R 倍</span><strong>{{ data.metrics.totalR ? `${formatNumber(data.metrics.totalR)}R` : '—' }}</strong><small>计划风险口径</small></article>
        <article class="metric-card"><span>平均盈亏</span><strong>{{ formatMoney(data.metrics.averagePnlCny) }}</strong><small>单笔人民币口径</small></article>
        <article class="metric-card"><span>A 级执行</span><strong>{{ formatPercent(data.metrics.gradeARate) }}</strong><small>完全按计划交易</small></article>
        <article class="metric-card"><span>Profit Factor</span><strong>{{ formatNumber(data.metrics.profitFactor) }}</strong><small>总盈利 / 总亏损</small></article>
      </section>

      <section class="dashboard-grid">
        <article class="market-panel wide">
          <header class="panel-heading"><div><div class="page-kicker">EQUITY CURVE</div><h2>累计盈亏曲线</h2></div><small>{{ data.dailyPnl.length }} 个交易日</small></header>
          <div v-if="data.dailyPnl.length > 0" class="equity-chart">
            <svg viewBox="0 0 1000 220" role="img" aria-label="累计人民币盈亏曲线" preserveAspectRatio="none"><line x1="0" x2="1000" :y1="cumulativeZeroY" :y2="cumulativeZeroY" /><polyline :points="cumulativePolyline" /></svg>
            <div><span>{{ formatTradingDate(cumulativeSeries[0]?.date) }}</span><strong>{{ formatMoney(cumulativeSeries.at(-1)?.cumulative) }}</strong><span>{{ formatTradingDate(cumulativeSeries.at(-1)?.date) }}</span></div>
          </div>
          <Empty v-else description="完成第一笔交易后显示收益路径" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </article>

        <article class="market-panel wide">
          <header class="panel-heading"><div><div class="page-kicker">P&L CALENDAR</div><h2>每日盈亏</h2></div><small>最近 30 个交易日</small></header>
          <div v-if="data.dailyPnl.length > 0" class="pnl-calendar">
            <div v-for="item in data.dailyPnl.slice(-30)" :key="item.date" :class="Number(item.pnlCny) >= 0 ? 'positive-day' : 'negative-day'" :style="{ '--strength': Math.max(0.14, Math.abs(Number(item.pnlCny)) / maxDaily) }">
              <span>{{ formatTradingDate(item.date, true) }}</span><b>{{ formatMoney(item.pnlCny) }}</b><small>{{ item.count }} 笔</small>
            </div>
          </div>
          <Empty v-else description="暂无交易日" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </article>

        <article class="market-panel">
          <header class="panel-heading"><div><div class="page-kicker">MARKET SPLIT</div><h2>市场表现</h2></div></header>
          <div class="breakdown-list"><div v-for="item in data.byMarket" :key="item.label"><span>{{ item.label }}<small>{{ item.count }} 笔 · 胜率 {{ formatPercent(item.winRate) }}</small></span><b :class="Number(item.pnlCny) >= 0 ? 'positive' : 'negative'">{{ formatMoney(item.pnlCny) }}</b></div></div>
          <Empty v-if="data.byMarket.length === 0" description="暂无已平仓交易" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </article>

        <article class="market-panel">
          <header class="panel-heading"><div><div class="page-kicker">BEHAVIOR</div><h2>高频错误</h2></div><RouterLink to="/trading/analytics">查看分析 →</RouterLink></header>
          <div class="rank-list"><div v-for="(item, index) in data.errorTagDistribution.slice(0, 6)" :key="item.label"><span>{{ String(index + 1).padStart(2, '0') }}</span><b>{{ item.label }}</b><i :style="{ width: `${Math.max(12, item.count / (data.errorTagDistribution[0]?.count || 1) * 100)}%` }"></i><em>{{ item.count }}</em></div></div>
          <Empty v-if="data.errorTagDistribution.length === 0" description="尚未记录错误标签" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </article>

        <article class="market-panel">
          <header class="panel-heading"><div><div class="page-kicker">OPEN TRADES</div><h2>待平仓记录</h2></div><RouterLink to="/trading/trades?status=open">全部 →</RouterLink></header>
          <button v-for="trade in data.openTrades" :key="trade.id" class="trade-row-button" type="button" @click="selectTrade(trade)"><span><b>{{ trade.symbol }}</b><small>{{ marketLabel(trade.market) }} · {{ sideLabel(trade.side) }} · {{ trade.strategy }}</small></span><time>{{ formatTradingDate(trade.tradeDate) }}</time></button>
          <Empty v-if="data.openTrades.length === 0" description="没有待平仓记录" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </article>

        <article class="market-panel">
          <header class="panel-heading"><div><div class="page-kicker">RECENT TRADES</div><h2>最近交易</h2></div><RouterLink to="/trading/trades">交易台账 →</RouterLink></header>
          <button v-for="trade in data.recentTrades" :key="trade.id" class="trade-row-button" type="button" @click="selectTrade(trade)"><span><b>{{ trade.symbol }}</b><small>{{ formatTradingDate(trade.tradeDate) }} · {{ trade.strategy }}</small></span><strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong></button>
          <Empty v-if="data.recentTrades.length === 0" description="还没有交易记录" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </article>

        <article class="market-panel wide">
          <header class="panel-heading"><div><div class="page-kicker">REVIEW QUEUE</div><h2>待完成日复盘</h2></div></header>
          <div class="review-date-list"><RouterLink v-for="date in data.pendingDailyReviews" :key="date" :to="`/trading/daily/${date}`"><span>{{ date }}</span><b>完成复盘 →</b></RouterLink></div>
          <Tag v-if="data.pendingDailyReviews.length === 0" color="green">已有交易日都完成了日复盘</Tag>
        </article>
      </section>
    </template>
    </PageFrame>

    <TradeFormModal :open="formOpen" :trade="editingTrade" :clone-source="cloneSource" @close="formOpen = false" @saved="load" />
    <TradeDetailDrawer :trade="selectedTrade" @close="selectTrade(null)" @edit="editTrade" @deleted="load" @refresh="load" @updated="selectedTrade = $event" />
  </div>
</template>
