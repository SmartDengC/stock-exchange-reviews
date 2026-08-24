<script lang="ts" setup>
import type { TradingDashboard } from '#/shared/types/trading';

import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Alert, DatePicker, Empty, Skeleton } from 'ant-design-vue';

import { getTradingDashboard } from '#/api';
import PageFrame from '#/components/page-frame.vue';
import { errorMessage, formatMoney, formatPercent } from '#/lib/trading';

const route = useRoute();
const router = useRouter();
const from = ref(typeof route.query.from === 'string' ? route.query.from : '');
const to = ref(typeof route.query.to === 'string' ? route.query.to : '');
const data = ref<null | TradingDashboard>(null);
const loading = ref(true);
const failure = ref('');

async function load() {
  loading.value = true;
  failure.value = '';
  try {
    data.value = await getTradingDashboard({ from: from.value || undefined, to: to.value || undefined });
  } catch (error) {
    failure.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}
watch([from, to], async () => {
  await router.replace({ query: { from: from.value || undefined, to: to.value || undefined } });
  await load();
});
function maxCount(items: Array<{ count: number }>) {
  return Math.max(1, ...items.map((item) => item.count));
}
onMounted(load);
</script>

<template>
  <PageFrame kicker="ANALYTICS" title="统计洞察" subtitle="看清哪种策略赚钱，以及哪种行为反复制造亏损。">
    <template #actions><div class="date-range"><DatePicker v-model:value="from" value-format="YYYY-MM-DD" /><span>至</span><DatePicker v-model:value="to" value-format="YYYY-MM-DD" /></div></template>
    <Skeleton v-if="loading" active :paragraph="{ rows: 9 }" />
    <Alert v-else-if="failure" type="error" show-icon :message="failure" />
    <section v-else-if="data" class="analytics-grid">
      <article class="market-panel wide">
        <header class="panel-heading"><div><div class="page-kicker">STRATEGY EDGE</div><h2>策略表现</h2></div></header>
        <div class="ledger-table-wrap"><table class="ledger-table"><thead><tr><th>策略</th><th>笔数</th><th>胜率</th><th>净盈亏</th></tr></thead><tbody><tr v-for="item in data.byStrategy" :key="item.label"><th>{{ item.label }}</th><td>{{ item.count }}</td><td>{{ formatPercent(item.winRate) }}</td><td :class="Number(item.pnlCny) >= 0 ? 'positive' : 'negative'">{{ formatMoney(item.pnlCny) }}</td></tr></tbody></table></div>
        <Empty v-if="data.byStrategy.length === 0" description="暂无策略统计" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </article>
      <article class="market-panel"><header class="panel-heading"><div><div class="page-kicker">EXECUTION</div><h2>执行评分</h2></div></header><div class="distribution-bars"><div v-for="item in data.gradeDistribution" :key="item.label"><span>{{ item.label }}</span><i><b :style="{ width: `${item.count / maxCount(data.gradeDistribution) * 100}%` }"></b></i><em>{{ item.count }}</em></div></div></article>
      <article class="market-panel"><header class="panel-heading"><div><div class="page-kicker">EMOTION</div><h2>情绪分布</h2></div></header><div class="distribution-bars"><div v-for="item in data.emotionDistribution" :key="item.label"><span>{{ item.label }}</span><i><b :style="{ width: `${item.count / maxCount(data.emotionDistribution) * 100}%` }"></b></i><em>{{ item.count }}</em></div></div></article>
      <article class="market-panel wide"><header class="panel-heading"><div><div class="page-kicker">ERROR PATTERNS</div><h2>错误模式</h2></div></header><div class="error-pattern-grid"><div v-for="item in data.errorTagDistribution" :key="item.label"><span>{{ item.label }}</span><strong>{{ item.count }}</strong><i :style="{ width: `${item.count / maxCount(data.errorTagDistribution) * 100}%` }"></i></div></div><Empty v-if="data.errorTagDistribution.length === 0" description="暂无错误标签统计" :image="Empty.PRESENTED_IMAGE_SIMPLE" /></article>
    </section>
  </PageFrame>
</template>
