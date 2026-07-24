<script setup lang="ts">
import type { DailyReviewInput, DailyReviewView } from "~~/shared/types/trading";
import { errorMessage, formatMoney, formatPercent } from "~/lib/trading";

definePageMeta({ middleware: "trading-auth" });
const route = useRoute();
const date = computed(() => String(route.params.date));
useSeoMeta({ title: () => `${date.value} 日复盘 · 私有交易复盘`, robots: "noindex, nofollow" });

const saving = ref(false);
const status = ref("");
const { data, pending, error, refresh } = await useFetch<DailyReviewView>(() => `/api/trading/daily-reviews/${date.value}`);
const form = reactive<DailyReviewInput>({ reviewDate: date.value });
const marketMetrics = computed(() => ["crypto", "a_share"].map((market) => {
  const trades = (data.value?.trades ?? []).filter((trade) => trade.market === market);
  const closed = trades.filter((trade) => trade.status === "closed");
  return {
    market,
    label: market === "crypto" ? "加密" : "A股",
    count: trades.length,
    pnlCny: closed.reduce((sum, trade) => sum + Number(trade.pnlCny ?? 0), 0),
  };
}));

watch(data, (value) => {
  if (!value) return;
  Object.assign(form, {
    reviewDate: value.reviewDate,
    marketPlan: value.marketPlan,
    dailySummary: value.dailySummary,
    bestTradeId: value.bestTradeId,
    biggestMistake: value.biggestMistake,
    tomorrowOneThing: value.tomorrowOneThing,
    plannedOnly: value.plannedOnly,
    followedStops: value.followedStops,
    avoidedImpulseAdds: value.avoidedImpulseAdds,
    avoidedRevengeTrading: value.avoidedRevengeTrading,
    exitedAsPlanned: value.exitedAsPlanned,
    priorityFix: value.priorityFix,
    notes: value.notes,
    updatedAt: value.id ? value.updatedAt : undefined,
  });
}, { immediate: true });

async function changeDate(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.value) await navigateTo(`/trading/daily/${target.value}`);
}

async function save() {
  saving.value = true;
  status.value = "";
  try {
    await $fetch(`/api/trading/daily-reviews/${date.value}`, { method: "PUT", body: form });
    status.value = "日复盘已保存";
    await refresh();
  } catch (cause) {
    status.value = errorMessage(cause);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <TradingShell eyebrow="DAILY REVIEW" :title="`${date} 日复盘`" subtitle="把自动统计和当天真正需要改进的动作放在一起。">
    <template #actions><input class="daily-date-picker" type="date" :value="date" @change="changeDate"></template>

    <div v-if="pending" class="trading-loading">正在整理当天交易…</div>
    <div v-else-if="error" class="trading-error">{{ error.message || "读取日复盘失败" }}</div>
    <template v-else-if="data">
      <section class="daily-metrics">
        <article><span>总笔数</span><strong>{{ data.metrics.closedTrades + data.metrics.openTrades }}</strong></article>
        <article><span>胜率</span><strong>{{ formatPercent(data.metrics.winRate) }}</strong></article>
        <article><span>净盈亏</span><strong :class="{ positive: Number(data.metrics.netPnlCny) >= 0, negative: Number(data.metrics.netPnlCny) < 0 }">{{ formatMoney(data.metrics.netPnlCny) }}</strong></article>
        <article><span>总 R</span><strong>{{ data.metrics.totalR ? `${data.metrics.totalR}R` : "—" }}</strong></article>
        <article><span>截图完整</span><strong>{{ data.screenshotComplete ? "是" : "否" }}</strong></article>
        <article v-for="item in marketMetrics" :key="item.market"><span>{{ item.label }} · {{ item.count }} 笔</span><strong :class="{ positive: item.pnlCny >= 0, negative: item.pnlCny < 0 }">{{ formatMoney(item.pnlCny) }}</strong></article>
      </section>

      <section class="daily-layout">
        <form class="daily-review-form" @submit.prevent="save">
          <section class="trading-panel">
            <header><div><span class="eyebrow">CONTEXT</span><h2>盘前与市场环境</h2></div></header>
            <textarea v-model="form.marketPlan" rows="6" placeholder="今天是什么市场环境？盘前只计划做什么？" />
          </section>
          <section class="trading-panel">
            <header><div><span class="eyebrow">REVIEW</span><h2>文字复盘</h2></div></header>
            <label>当天交易总结<textarea v-model="form.dailySummary" rows="5" placeholder="今天整体做得怎样？" /></label>
            <label>最满意的一笔<select v-model="form.bestTradeId"><option :value="null">未选择</option><option v-for="trade in data.trades" :key="trade.id" :value="trade.id">{{ trade.symbol }} · {{ trade.strategy }} · {{ formatMoney(trade.pnlCny) }}</option></select></label>
            <label>最大失误与原因<textarea v-model="form.biggestMistake" rows="4" /></label>
            <label>明日只改一件事<textarea v-model="form.tomorrowOneThing" rows="3" placeholder="只写一个可执行动作" /></label>
          </section>
          <section class="trading-panel">
            <header><div><span class="eyebrow">DISCIPLINE</span><h2>纪律检查</h2></div></header>
            <div class="discipline-grid">
              <label>是否只做计划内交易<select v-model="form.plannedOnly"><option :value="null">未检查</option><option :value="true">是</option><option :value="false">否</option></select></label>
              <label>是否严格执行止损<select v-model="form.followedStops"><option :value="null">未检查</option><option :value="true">是</option><option :value="false">否</option></select></label>
              <label>是否避免临盘加仓冲动<select v-model="form.avoidedImpulseAdds"><option :value="null">未检查</option><option :value="true">是</option><option :value="false">否</option></select></label>
              <label>是否避免报复性交易<select v-model="form.avoidedRevengeTrading"><option :value="null">未检查</option><option :value="true">是</option><option :value="false">否</option></select></label>
              <label>是否按计划离场<select v-model="form.exitedAsPlanned"><option :value="null">未检查</option><option :value="true">是</option><option :value="false">否</option></select></label>
              <label>明日优先修正项<input v-model="form.priorityFix"></label>
            </div>
            <label>备注<textarea v-model="form.notes" rows="3" /></label>
          </section>
          <div class="daily-save-bar"><span>{{ status }}</span><button class="trading-primary-button" type="submit" :disabled="saving">{{ saving ? "正在保存…" : "保存日复盘" }}</button></div>
        </form>

        <aside class="daily-trade-rail">
          <div class="trading-panel">
            <header><div><span class="eyebrow">TODAY'S TRADES</span><h2>当天交易</h2></div></header>
            <NuxtLink v-for="trade in data.trades" :key="trade.id" to="/trading/trades" class="daily-trade-item">
              <span><b>{{ trade.symbol }}</b><small>{{ trade.strategy }} · {{ trade.executionGrade ?? "未评分" }}</small></span>
              <strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong>
            </NuxtLink>
            <p v-if="!data.trades.length" class="trading-empty">当天没有交易。</p>
          </div>
        </aside>
      </section>
    </template>
  </TradingShell>
</template>
