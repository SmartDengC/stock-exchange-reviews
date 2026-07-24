<script setup lang="ts">
import type { TradingDashboard } from "~~/shared/types/trading";
import { formatMoney, formatPercent } from "~/lib/trading";

definePageMeta({ middleware: "trading-auth" });
useSeoMeta({ title: "统计洞察 · 私有交易复盘", robots: "noindex, nofollow" });

const from = ref("");
const to = ref("");
const { data, pending, error } = await useFetch<TradingDashboard>("/api/trading/dashboard", {
  query: computed(() => ({ from: from.value || undefined, to: to.value || undefined })),
});

function maxCount(items: Array<{ count: number }> | undefined) {
  return Math.max(1, ...(items ?? []).map((item) => item.count));
}
</script>

<template>
  <TradingShell eyebrow="ANALYTICS" title="统计洞察" subtitle="看清哪种策略赚钱，以及哪种行为反复制造亏损。">
    <template #actions><div class="analytics-date-range"><input v-model="from" type="date"><span>至</span><input v-model="to" type="date"></div></template>
    <div v-if="pending" class="trading-loading">正在计算统计洞察…</div>
    <div v-else-if="error" class="trading-error">{{ error.message || "读取统计失败" }}</div>
    <section v-else-if="data" class="analytics-grid">
      <article class="trading-panel analytics-wide">
        <header><div><span class="eyebrow">STRATEGY EDGE</span><h2>策略表现</h2></div></header>
        <div class="analytics-table">
          <div class="analytics-head"><span>策略</span><span>笔数</span><span>胜率</span><span>净盈亏</span></div>
          <div v-for="item in data.byStrategy" :key="item.label"><b>{{ item.label }}</b><span>{{ item.count }}</span><span>{{ formatPercent(item.winRate) }}</span><strong :class="{ positive: Number(item.pnlCny) >= 0, negative: Number(item.pnlCny) < 0 }">{{ formatMoney(item.pnlCny) }}</strong></div>
        </div>
      </article>
      <article class="trading-panel">
        <header><div><span class="eyebrow">EXECUTION</span><h2>执行评分</h2></div></header>
        <div class="distribution-bars">
          <div v-for="item in data.gradeDistribution" :key="item.label"><span>{{ item.label }}</span><i><b :style="{ width: `${item.count / maxCount(data.gradeDistribution) * 100}%` }" /></i><em>{{ item.count }}</em></div>
        </div>
      </article>
      <article class="trading-panel">
        <header><div><span class="eyebrow">EMOTION</span><h2>情绪分布</h2></div></header>
        <div class="distribution-bars">
          <div v-for="item in data.emotionDistribution" :key="item.label"><span>{{ item.label }}</span><i><b :style="{ width: `${item.count / maxCount(data.emotionDistribution) * 100}%` }" /></i><em>{{ item.count }}</em></div>
        </div>
      </article>
      <article class="trading-panel analytics-wide">
        <header><div><span class="eyebrow">ERROR PATTERNS</span><h2>错误模式</h2></div></header>
        <div class="error-pattern-grid">
          <div v-for="item in data.errorTagDistribution" :key="item.label"><span>{{ item.label }}</span><strong>{{ item.count }}</strong><i :style="{ width: `${item.count / maxCount(data.errorTagDistribution) * 100}%` }" /></div>
        </div>
      </article>
    </section>
  </TradingShell>
</template>
