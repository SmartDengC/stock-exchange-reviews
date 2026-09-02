<script lang="ts" setup>
import type { MarketQuoteConfig, MarketQuoteConfigInput, MarketQuotesResponse } from '#/types/market';
import type { ResearchReview } from '#/types/research';

import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button, Card, Drawer, Empty, Form, FormItem, Input, InputNumber, message, Modal, Popconfirm, Result, Skeleton, Switch, Tag } from 'ant-design-vue';

import {
  createMarketQuoteConfig,
  disableMarketQuoteConfig,
  getMarketQuotes,
  isCanceledRequest,
  listMarketQuoteConfigs,
  listResearchReviews,
  updateMarketQuoteConfig,
} from '#/api';
import MarkdownDocument from '#/components/markdown-document.vue';
import PageFrame from '#/components/page-frame.vue';
import { changeTone, sortResearchReviewsByArchiveIdentifier, tableForHeading } from '#/lib/reviews';
import { errorMessage } from '#/lib/trading';

const router = useRouter();
const weeklyReview = ref<null | ResearchReview>(null);
const dailyReview = ref<null | ResearchReview>(null);
const readingReview = ref<null | ResearchReview>(null);
const reviewLoading = ref(true);
const reviewError = ref('');
const quoteData = ref<MarketQuotesResponse | null>(null);
const quoteLoading = ref(true);
const quoteError = ref('');
const drawerOpen = ref(false);
const configOpen = ref(false);
const configModalOpen = ref(false);
const configLoading = ref(false);
const configSaving = ref(false);
const configs = ref<MarketQuoteConfig[]>([]);
const editingConfig = ref<MarketQuoteConfig | null>(null);
const configForm = reactive<MarketQuoteConfigInput>({ displayName: '', market: '', sinaSymbol: '', unit: '', sortOrder: 0, enabled: true });
let quoteAbortController: AbortController | null = null;

const strongest = computed(() => tableForHeading(weeklyReview.value?.content ?? '', '周度最强'));
const weakest = computed(() => tableForHeading(weeklyReview.value?.content ?? '', '周度最惨'));

function assignConfigForm(input: MarketQuoteConfigInput) {
  Object.assign(configForm, {
    displayName: input.displayName,
    enabled: input.enabled,
    market: input.market,
    sinaSymbol: input.sinaSymbol,
    sortOrder: input.sortOrder,
    unit: input.unit,
    version: input.version,
  });
}

function quoteTone(change: null | string) {
  return changeTone(change ?? '') as 'negative' | 'neutral' | 'positive';
}

function formatQuoteTime(value: null | string) {
  if (!value) return '无行情时间';
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(value));
}

async function loadReviews() {
  reviewLoading.value = true;
  reviewError.value = '';
  try {
    const [weeklyReviews, dailyReviews] = await Promise.all([
      listResearchReviews({ kind: 'weekly' }),
      listResearchReviews({ kind: 'daily' }),
    ]);
    weeklyReview.value = sortResearchReviewsByArchiveIdentifier(weeklyReviews, 'weekly')[0] ?? null;
    dailyReview.value = dailyReviews[0] ?? null;
  } catch (error) {
    reviewError.value = errorMessage(error);
  } finally {
    reviewLoading.value = false;
  }
}

function openReview(review: ResearchReview) {
  readingReview.value = review;
  drawerOpen.value = true;
}

async function loadQuotes() {
  quoteAbortController?.abort();
  const controller = new AbortController();
  quoteAbortController = controller;
  quoteLoading.value = true;
  quoteError.value = '';
  try {
    quoteData.value = await getMarketQuotes(controller.signal);
  } catch (error) {
    if (isCanceledRequest(error)) return;
    quoteError.value = errorMessage(error);
  } finally {
    if (quoteAbortController === controller) {
      quoteAbortController = null;
      quoteLoading.value = false;
    }
  }
}

async function loadConfigs() {
  configLoading.value = true;
  try {
    configs.value = await listMarketQuoteConfigs();
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    configLoading.value = false;
  }
}

async function openConfigs() {
  configOpen.value = true;
  await loadConfigs();
}

function openCreate() {
  editingConfig.value = null;
  assignConfigForm({ displayName: '', market: '', sinaSymbol: '', unit: '', sortOrder: configs.value.length * 10, enabled: true });
  configModalOpen.value = true;
}

function openEdit(config: MarketQuoteConfig) {
  editingConfig.value = config;
  assignConfigForm(config);
  configModalOpen.value = true;
}

async function saveConfig() {
  if (configSaving.value) return;
  configSaving.value = true;
  try {
    await (editingConfig.value
      ? updateMarketQuoteConfig(editingConfig.value.id, configForm)
      : createMarketQuoteConfig(configForm));
    configModalOpen.value = false;
    await Promise.all([loadConfigs(), loadQuotes()]);
    message.success('行情配置已保存');
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    configSaving.value = false;
  }
}

async function disableConfig(id: string) {
  try {
    await disableMarketQuoteConfig(id);
    await Promise.all([loadConfigs(), loadQuotes()]);
    message.success('行情已停用');
  } catch (error) {
    message.error(errorMessage(error));
  }
}

async function toggleConfig(config: MarketQuoteConfig) {
  try {
    await updateMarketQuoteConfig(config.id, {
      displayName: config.displayName,
      enabled: !config.enabled,
      market: config.market,
      sinaSymbol: config.sinaSymbol,
      sortOrder: config.sortOrder,
      unit: config.unit,
      version: config.version,
    });
    await Promise.all([loadConfigs(), loadQuotes()]);
    message.success(config.enabled ? '行情已停用' : '行情已启用');
  } catch (error) {
    message.error(errorMessage(error));
  }
}

onMounted(() => void Promise.all([loadReviews(), loadQuotes()]));
onBeforeUnmount(() => quoteAbortController?.abort());
</script>

<template>
  <PageFrame title="周度研究终端" :subtitle="weeklyReview ? `最新资料 ${weeklyReview.slug} · ${weeklyReview.dateLabel}` : '跨市场表现、板块轮动与研究归档。'">
    <template #actions>
      <Button :loading="quoteLoading" @click="loadQuotes">刷新行情</Button>
      <Button @click="openConfigs">行情配置</Button>
      <Button @click="router.push('/research/weekly')">查看归档</Button>
      <Button type="primary" @click="router.push('/research/edit/weekly')">新建周复盘</Button>
    </template>

    <section class="market-panel quote-panel">
      <header class="panel-heading"><div><div class="page-kicker">MARKET SNAPSHOT</div><h2>市场行情</h2></div><small>{{ quoteData?.source || '新浪财经' }} · {{ quoteData ? formatQuoteTime(quoteData.fetchedAt) : '读取中' }}</small></header>
      <Skeleton v-if="quoteLoading && !quoteData" active :paragraph="{ rows: 2 }" />
      <Result v-else-if="quoteError && !quoteData" status="error" title="行情读取失败" :sub-title="quoteError"><template #extra><Button @click="loadQuotes">重试</Button></template></Result>
      <div v-else-if="quoteData?.items.length" class="metric-grid">
        <article v-for="item in quoteData.items" :key="item.configId" class="metric-card quote-card">
          <div class="metric-card-head"><span class="metric-label">{{ item.market }}</span><Tag :color="quoteTone(item.change)">{{ item.changePercent || '—' }}</Tag></div>
          <div class="metric-value" :class="quoteTone(item.change)">{{ item.status === 'ok' ? item.value : '—' }}</div>
          <strong>{{ item.displayName }}</strong>
          <small>{{ item.status === 'ok' ? `${item.change || '—'} · ${item.unit} · ${formatQuoteTime(item.quoteTime)}` : item.message }}</small>
        </article>
      </div>
      <Empty v-else description="尚未配置行情" />
      <p v-if="quoteError && quoteData" class="quote-stale">本次刷新失败，当前显示最近一次成功行情：{{ quoteError }}</p>
      <p class="quote-disclaimer">行情来源：新浪财经。报价可能存在延迟，行情时间以数据源返回为准。</p>
    </section>

    <section v-if="reviewLoading" class="terminal-panel state-panel"><Skeleton active :paragraph="{ rows: 8 }" /></section>
    <Result v-else-if="reviewError" status="error" title="读取复盘失败" :sub-title="reviewError"><template #extra><Button @click="loadReviews">重试</Button></template></Result>
    <section v-else>
      <div v-if="weeklyReview" class="section-grid">
        <Card class="terminal-panel" :bordered="false" title="相对强势"><div v-if="strongest?.rows.length" class="rank-list"><div v-for="row in strongest.rows.slice(0, 6)" :key="row[0]"><strong>{{ row[0] }}</strong><span>{{ row[1] }}</span><small>{{ row[2] }}</small></div></div><Empty v-else description="暂无结构化强势板块数据" /></Card>
        <Card class="terminal-panel" :bordered="false" title="持续承压"><div v-if="weakest?.rows.length" class="rank-list"><div v-for="row in weakest.rows.slice(0, 6)" :key="row[0]"><strong>{{ row[0] }}</strong><span>{{ row[1] }}</span><small>{{ row[2] }}</small></div></div><Empty v-else description="暂无结构化弱势板块数据" /></Card>
      </div>
      <div class="section-grid">
        <Card v-if="weeklyReview" class="terminal-panel research-source weekly-review-card" :bordered="false"><div class="review-card-kicker">最新周复盘</div><Tag color="green">{{ weeklyReview.slug }}</Tag><h2>{{ weeklyReview.title }}</h2><p>{{ weeklyReview.dateLabel }}</p><div class="page-actions"><Button @click="openReview(weeklyReview)">快速阅读</Button><Button type="primary" @click="router.push(`/report/weekly/${weeklyReview.slug}`)">打开完整报告</Button></div></Card>
        <Card v-else class="terminal-panel" :bordered="false"><Empty description="暂无周复盘" /></Card>
        <Card v-if="dailyReview" class="terminal-panel research-source daily-review-card" :bordered="false"><div class="review-card-kicker">最新日复盘</div><Tag color="green">{{ dailyReview.slug }}</Tag><h2>{{ dailyReview.title }}</h2><p>{{ dailyReview.dateLabel }}</p><div class="page-actions"><Button @click="openReview(dailyReview)">快速阅读</Button><Button type="primary" @click="router.push(`/report/daily/${dailyReview.slug}`)">打开完整报告</Button></div></Card>
        <Card v-else class="terminal-panel" :bordered="false"><Empty description="暂无日复盘" /></Card>
      </div>
      <section v-if="!weeklyReview && !dailyReview" class="terminal-panel state-panel"><Empty description="尚未创建复盘" /></section>
    </section>

    <Drawer v-model:open="drawerOpen" width="min(52rem, 92vw)" :title="readingReview?.title"><MarkdownDocument v-if="readingReview" :markdown="readingReview.content" /></Drawer>
    <Drawer v-model:open="configOpen" title="行情配置" width="min(38rem, 92vw)">
      <div class="config-toolbar"><span class="muted">启用的行情会显示在总览卡片中。</span><Button type="primary" @click="openCreate">新增行情</Button></div>
      <Skeleton v-if="configLoading" active />
      <div v-else class="quote-config-list">
        <article v-for="config in configs" :key="config.id" class="quote-config-row" :class="{ disabled: !config.enabled }"><div><strong>{{ config.displayName }}</strong><small>{{ config.market }} · {{ config.sinaSymbol }} · {{ config.unit }}</small></div><div class="quote-config-actions"><Switch :checked="config.enabled" @change="toggleConfig(config)" /><Button size="small" @click="openEdit(config)">编辑</Button><Popconfirm v-if="config.enabled" title="停用此行情？" ok-text="停用" cancel-text="取消" @confirm="disableConfig(config.id)"><Button size="small" danger>停用</Button></Popconfirm></div></article>
      </div>
    </Drawer>
    <Modal v-model:open="configModalOpen" :title="editingConfig ? '编辑行情' : '新增行情'" :confirm-loading="configSaving" ok-text="保存" cancel-text="取消" @ok="saveConfig">
      <Form layout="vertical"><FormItem label="显示名称"><Input v-model:value="configForm.displayName" placeholder="例如：上证指数" /></FormItem><FormItem label="市场分组"><Input v-model:value="configForm.market" placeholder="例如：A股" /></FormItem><FormItem label="新浪代码"><Input v-model:value="configForm.sinaSymbol" placeholder="例如：sh000001" /></FormItem><FormItem label="单位"><Input v-model:value="configForm.unit" placeholder="例如：点" /></FormItem><FormItem label="排序"><InputNumber v-model:value="configForm.sortOrder" :min="0" :max="1000000" /></FormItem><FormItem label="启用"><Switch v-model:checked="configForm.enabled" /></FormItem></Form>
    </Modal>
  </PageFrame>
</template>
