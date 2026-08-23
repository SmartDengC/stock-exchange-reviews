<script setup lang="ts">
import type { TradingDashboard } from "~~/shared/types/trading";
import { formatMoney, formatPercent } from "~/lib/trading";

useSeoMeta({ title: "统计洞察 · 私有交易复盘", robots: "noindex, nofollow" });

const route = useRoute();
const router = useRouter();
const from = ref(typeof route.query.from === "string" ? route.query.from : "");
const to = ref(typeof route.query.to === "string" ? route.query.to : "");
const { data, pending, error } = useFetch<TradingDashboard>("/api/trading/dashboard", {
  lazy: true,
  server: false,
  query: computed(() => ({ from: from.value || undefined, to: to.value || undefined })),
});

watch([from, to], ([nextFrom, nextTo]) => {
  router.replace({ query: { ...route.query, from: nextFrom || undefined, to: nextTo || undefined } });
});

function maxCount(items: Array<{ count: number }> | undefined) {
  return Math.max(1, ...(items ?? []).map((item) => item.count));
}
</script>

<template>
  <TradingShell eyebrow="ANALYTICS" title="统计洞察" subtitle="看清哪种策略赚钱，以及哪种行为反复制造亏损。">
    <template #actions><div class="analytics-date-range"><input v-model="from" name="from" type="date" aria-label="开始日期" autocomplete="off"><span>至</span><input v-model="to" name="to" type="date" aria-label="结束日期" autocomplete="off"></div></template>
    <div v-if="pending" class="trading-loading" role="status" aria-live="polite">正在计算统计洞察…</div>
    <div v-else-if="error" class="trading-error" role="alert" aria-live="polite">{{ error.message || "读取统计失败，请刷新页面后重试" }}</div>
    <section v-else-if="data" class="analytics-grid">
      <article class="trading-panel analytics-wide">
        <header><div><span class="eyebrow">STRATEGY EDGE</span><h2>策略表现</h2></div></header>
        <table class="analytics-table">
          <thead><tr><th>策略</th><th>笔数</th><th>胜率</th><th>净盈亏</th></tr></thead>
          <tbody><tr v-for="item in data.byStrategy" :key="item.label"><th scope="row">{{ item.label }}</th><td>{{ item.count }}</td><td>{{ formatPercent(item.winRate) }}</td><td :class="{ positive: Number(item.pnlCny) >= 0, negative: Number(item.pnlCny) < 0 }">{{ formatMoney(item.pnlCny) }}</td></tr></tbody>
        </table>
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
