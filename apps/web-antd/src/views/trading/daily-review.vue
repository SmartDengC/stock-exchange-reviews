<script lang="ts" setup>
import type { DailyReviewInput, DailyReviewView } from '#/shared/types/trading';

import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  FormItem,
  Input,
  Select,
  Skeleton,
  Textarea,
} from 'ant-design-vue';

import { getDailyReview, saveDailyReview } from '#/api';
import PageFrame from '#/components/page-frame.vue';
import {
  errorMessage,
  formatMoney,
  formatPercent,
  formatTradingDate,
} from '#/lib/trading';

const route = useRoute();
const router = useRouter();
const date = computed(() => String(route.params.date));
const data = ref<DailyReviewView | null>(null);
const loading = ref(true);
const saving = ref(false);
const failure = ref('');
const status = ref('');
type DailyReviewForm = Omit<
  DailyReviewInput,
  | 'bestTradeId'
  | 'biggestMistake'
  | 'dailySummary'
  | 'marketPlan'
  | 'notes'
  | 'priorityFix'
  | 'tomorrowOneThing'
> & {
  bestTradeId: string | undefined;
  biggestMistake: string;
  dailySummary: string;
  marketPlan: string;
  notes: string;
  priorityFix: string;
  tomorrowOneThing: string;
};
const form = reactive<DailyReviewForm>({
  bestTradeId: undefined,
  biggestMistake: '',
  dailySummary: '',
  marketPlan: '',
  notes: '',
  priorityFix: '',
  reviewDate: date.value,
  tomorrowOneThing: '',
});
const initialSnapshot = ref('');
const dirty = computed(() => Boolean(initialSnapshot.value) && JSON.stringify(form) !== initialSnapshot.value);
const booleanOptions = [
  { label: '未检查', value: 'unset' },
  { label: '是', value: 'yes' },
  { label: '否', value: 'no' },
];

type DisciplineKey =
  | 'avoidedImpulseAdds'
  | 'avoidedRevengeTrading'
  | 'exitedAsPlanned'
  | 'followedStops'
  | 'plannedOnly';

function disciplineValue(key: DisciplineKey) {
  const value = form[key];
  return value == null ? 'unset' : (value ? 'yes' : 'no');
}

function setDiscipline(key: DisciplineKey, value: unknown) {
  form[key] = value === 'unset' ? null : value === 'yes';
}

const marketMetrics = computed(() => ['crypto', 'a_share'].map((market) => {
  const trades = (data.value?.trades ?? []).filter((trade) => trade.market === market);
  return {
    count: trades.length,
    label: market === 'crypto' ? '加密' : 'A 股',
    market,
    pnlCny: trades.filter((trade) => trade.status === 'closed').reduce((sum, trade) => sum + Number(trade.pnlCny ?? 0), 0),
  };
}));

function hydrate(value: DailyReviewView) {
  data.value = value;
  Object.assign(form, {
    avoidedImpulseAdds: value.avoidedImpulseAdds,
    avoidedRevengeTrading: value.avoidedRevengeTrading,
    bestTradeId: value.bestTradeId ?? undefined,
    biggestMistake: value.biggestMistake ?? '',
    dailySummary: value.dailySummary ?? '',
    exitedAsPlanned: value.exitedAsPlanned,
    followedStops: value.followedStops,
    marketPlan: value.marketPlan ?? '',
    notes: value.notes ?? '',
    plannedOnly: value.plannedOnly,
    priorityFix: value.priorityFix ?? '',
    reviewDate: value.reviewDate,
    tomorrowOneThing: value.tomorrowOneThing ?? '',
    version: value.id ? value.version : undefined,
  });
  initialSnapshot.value = JSON.stringify(form);
}

async function load() {
  loading.value = true;
  failure.value = '';
  status.value = '';
  try {
    hydrate(await getDailyReview(date.value));
  } catch (error) {
    failure.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function changeDate(value: string) {
  if (value) await router.push(`/trading/daily/${value}`);
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  status.value = '';
  try {
    hydrate(await saveDailyReview(date.value, { ...form }));
    status.value = '日复盘已保存';
  } catch (error) {
    status.value = errorMessage(error);
  } finally {
    saving.value = false;
  }
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = '';
}

watch(date, load);
onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload);
  void load();
});
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload));
onBeforeRouteLeave(() => !dirty.value || window.confirm('日复盘还有未保存的修改，确定离开吗？'));
</script>

<template>
  <PageFrame kicker="DAILY REVIEW" :title="`${formatTradingDate(date)} 日复盘`" subtitle="把自动统计和当天真正需要改进的动作放在一起。">
    <template #actions><DatePicker :value="date" value-format="YYYY-MM-DD" aria-label="复盘日期" @update:value="(value) => changeDate(String(value))" /></template>

    <Skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
    <Alert v-else-if="failure" type="error" show-icon :message="failure" />
    <template v-else-if="data">
      <section class="metric-grid daily-metrics">
        <article class="metric-card"><span>总笔数</span><strong>{{ data.metrics.closedTrades + data.metrics.openTrades }}</strong></article>
        <article class="metric-card"><span>胜率</span><strong>{{ formatPercent(data.metrics.winRate) }}</strong></article>
        <article class="metric-card"><span>净盈亏</span><strong :class="Number(data.metrics.netPnlCny) >= 0 ? 'positive' : 'negative'">{{ formatMoney(data.metrics.netPnlCny) }}</strong></article>
        <article class="metric-card"><span>总 R</span><strong>{{ data.metrics.totalR ? `${data.metrics.totalR}R` : '—' }}</strong></article>
        <article class="metric-card"><span>截图完整</span><strong>{{ data.screenshotComplete ? '是' : '否' }}</strong></article>
        <article v-for="item in marketMetrics" :key="item.market" class="metric-card"><span>{{ item.label }} · {{ item.count }} 笔</span><strong :class="item.pnlCny >= 0 ? 'positive' : 'negative'">{{ formatMoney(item.pnlCny) }}</strong></article>
      </section>

      <div class="daily-layout">
        <Form :model="form" layout="vertical" class="daily-form" @submit.prevent="save">
          <section class="market-panel">
            <header class="panel-heading"><div><div class="page-kicker">CONTEXT</div><h2>盘前与市场环境</h2></div></header>
            <FormItem label="盘前计划"><Textarea v-model:value="form.marketPlan" :rows="6" placeholder="震荡市场，只做计划内的突破机会…" /></FormItem>
          </section>
          <section class="market-panel">
            <header class="panel-heading"><div><div class="page-kicker">REVIEW</div><h2>文字复盘</h2></div></header>
            <FormItem label="当天交易总结"><Textarea v-model:value="form.dailySummary" :rows="5" /></FormItem>
            <FormItem label="最满意的一笔"><Select v-model:value="form.bestTradeId" allow-clear :options="data.trades.map((trade) => ({ label: `${trade.symbol} · ${trade.strategy} · ${formatMoney(trade.pnlCny)}`, value: trade.id }))" /></FormItem>
            <FormItem label="最大失误与原因"><Textarea v-model:value="form.biggestMistake" :rows="4" /></FormItem>
            <FormItem label="明日只改一件事"><Textarea v-model:value="form.tomorrowOneThing" :rows="3" /></FormItem>
          </section>
          <section class="market-panel">
            <header class="panel-heading"><div><div class="page-kicker">DISCIPLINE</div><h2>纪律检查</h2></div></header>
            <div class="discipline-grid">
              <FormItem label="是否只做计划内交易"><Select :value="disciplineValue('plannedOnly')" :options="booleanOptions" @change="setDiscipline('plannedOnly', $event)" /></FormItem>
              <FormItem label="是否严格执行止损"><Select :value="disciplineValue('followedStops')" :options="booleanOptions" @change="setDiscipline('followedStops', $event)" /></FormItem>
              <FormItem label="是否避免临盘加仓冲动"><Select :value="disciplineValue('avoidedImpulseAdds')" :options="booleanOptions" @change="setDiscipline('avoidedImpulseAdds', $event)" /></FormItem>
              <FormItem label="是否避免报复性交易"><Select :value="disciplineValue('avoidedRevengeTrading')" :options="booleanOptions" @change="setDiscipline('avoidedRevengeTrading', $event)" /></FormItem>
              <FormItem label="是否按计划离场"><Select :value="disciplineValue('exitedAsPlanned')" :options="booleanOptions" @change="setDiscipline('exitedAsPlanned', $event)" /></FormItem>
              <FormItem label="明日优先修正项"><Input v-model:value="form.priorityFix" /></FormItem>
            </div>
            <FormItem label="备注"><Textarea v-model:value="form.notes" :rows="3" /></FormItem>
          </section>
          <div class="save-bar"><span :class="{ negative: status && status !== '日复盘已保存' }" role="status">{{ status }}</span><Button type="primary" html-type="submit" :loading="saving">保存日复盘</Button></div>
        </Form>

        <aside class="market-panel daily-trades">
          <header class="panel-heading"><div><div class="page-kicker">TODAY'S TRADES</div><h2>当天交易</h2></div></header>
          <RouterLink v-for="trade in data.trades" :key="trade.id" :to="{ path: '/trading/trades', query: { tradeId: trade.id } }" class="daily-trade-item"><span><b>{{ trade.symbol }}</b><small>{{ trade.strategy }} · {{ trade.executionGrade ?? '未评分' }}</small></span><strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong></RouterLink>
          <Empty v-if="data.trades.length === 0" description="当天没有交易" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </aside>
      </div>
    </template>
  </PageFrame>
</template>
