<script lang="ts" setup>
import type {
  QuantBacktest,
  QuantBacktestInput,
  QuantStrategy,
  QuantStrategyInput,
  QuantStrategyListItem,
} from '#/types/quant';

import { computed, onMounted, reactive, ref } from 'vue';

import { PlusOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Skeleton,
  Tag,
} from 'ant-design-vue';

import {
  createQuantBacktest,
  createQuantStrategy,
  deleteQuantBacktest,
  deleteQuantStrategy,
  getQuantStrategy,
  listQuantStrategies,
  updateQuantBacktest,
  updateQuantStrategy,
} from '#/api';
import MarkdownDocument from '#/components/markdown-document.vue';
import PageFrame from '#/components/page-frame.vue';
import { highlightPython } from '#/lib/python-highlight';
import { errorMessage } from '#/lib/trading';

const strategies = ref<QuantStrategyListItem[]>([]);
const loading = ref(true);
const failure = ref('');
const status = ref('');
const statusTone = ref<'error' | 'success'>('success');
const query = ref('');

const filteredStrategies = computed(() => {
  const value = query.value.trim().toLowerCase();
  if (!value) return strategies.value;
  return strategies.value.filter((item) =>
    [item.name, item.fileName, item.summary].some((field) => field.toLowerCase().includes(value)),
  );
});

const highlightedSource = computed(() => highlightPython(detail.value?.sourceCode ?? ''));

const detailOpen = ref(false);
const detailLoading = ref(false);
const detail = ref<null | QuantStrategy>(null);

const strategyModalOpen = ref(false);
const strategySaving = ref(false);
const editingStrategy = ref<null | QuantStrategy>(null);
const strategyForm = reactive<QuantStrategyInput>({
  explanation: '',
  fileName: '',
  isExample: false,
  name: '',
  sourceCode: '',
  summary: '',
  timeframe: '5m',
});

const backtestModalOpen = ref(false);
const backtestSaving = ref(false);
const editingBacktest = ref<null | QuantBacktest>(null);
const backtestStrategyId = ref('');
type BacktestForm = Omit<
  QuantBacktestInput,
  'maxDrawdown' | 'notes' | 'profitFactor' | 'totalReturn' | 'tradeCount' | 'winRate'
> & {
  maxDrawdown: string;
  notes: string;
  profitFactor: string;
  totalReturn: string;
  tradeCount: number | undefined;
  winRate: string;
};
const backtestForm = reactive<BacktestForm>({
  maxDrawdown: '',
  notes: '',
  pairs: '',
  profitFactor: '',
  runAt: '',
  timeframe: '5m',
  timerange: '',
  totalReturn: '',
  tradeCount: undefined,
  winRate: '',
});

function setStatus(message: string, tone: 'error' | 'success' = 'success') {
  status.value = message;
  statusTone.value = tone;
}

function clearStrategyForm() {
  strategyForm.explanation = '';
  strategyForm.fileName = '';
  strategyForm.isExample = false;
  strategyForm.name = '';
  strategyForm.sourceCode = '';
  strategyForm.summary = '';
  strategyForm.timeframe = '5m';
}

function openCreateStrategy() {
  editingStrategy.value = null;
  clearStrategyForm();
  strategyModalOpen.value = true;
}

function openEditStrategy(item: QuantStrategy) {
  editingStrategy.value = item;
  strategyForm.explanation = item.explanation;
  strategyForm.fileName = item.fileName;
  strategyForm.isExample = item.isExample;
  strategyForm.name = item.name;
  strategyForm.sourceCode = item.sourceCode;
  strategyForm.summary = item.summary;
  strategyForm.timeframe = item.timeframe;
  strategyModalOpen.value = true;
}

async function saveStrategy() {
  if (
    !strategyForm.name.trim() ||
    !strategyForm.fileName.trim() ||
    !strategyForm.sourceCode.trim() ||
    !strategyForm.explanation.trim()
  ) {
    setStatus('策略名称、文件名、源码和讲解不能为空。', 'error');
    return;
  }
  strategySaving.value = true;
  try {
    if (editingStrategy.value) {
      await updateQuantStrategy(editingStrategy.value.id, {
        ...strategyForm,
        version: editingStrategy.value.version,
      });
      setStatus('策略已更新。');
    } else {
      await createQuantStrategy({ ...strategyForm });
      setStatus('策略已新增。');
    }
    strategyModalOpen.value = false;
    await load();
    if (detail.value) await openDetail(detail.value.id);
  } catch (error) {
    setStatus(errorMessage(error), 'error');
  } finally {
    strategySaving.value = false;
  }
}

async function openDetail(id: string) {
  detailOpen.value = true;
  detailLoading.value = true;
  try {
    detail.value = await getQuantStrategy(id);
  } catch (error) {
    setStatus(errorMessage(error), 'error');
  } finally {
    detailLoading.value = false;
  }
}

function removeStrategy(item: QuantStrategy | QuantStrategyListItem) {
  Modal.confirm({
    cancelText: '取消',
    content: `删除“${item.name}”会同时删除其全部回测记录，且不可恢复。`,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除量化策略？',
    async onOk() {
      try {
        await deleteQuantStrategy(item.id);
        detailOpen.value = false;
        detail.value = null;
        setStatus('策略已删除。');
        await load();
      } catch (error) {
        setStatus(errorMessage(error), 'error');
      }
    },
  });
}

function clearBacktestForm() {
  backtestForm.maxDrawdown = '';
  backtestForm.notes = '';
  backtestForm.pairs = '';
  backtestForm.profitFactor = '';
  backtestForm.runAt = '';
  backtestForm.timeframe = detail.value?.timeframe ?? '5m';
  backtestForm.timerange = '';
  backtestForm.totalReturn = '';
  backtestForm.tradeCount = undefined;
  backtestForm.winRate = '';
}

function openCreateBacktest() {
  if (!detail.value) return;
  editingBacktest.value = null;
  backtestStrategyId.value = detail.value.id;
  clearBacktestForm();
  backtestModalOpen.value = true;
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function openEditBacktest(item: QuantBacktest) {
  editingBacktest.value = item;
  backtestStrategyId.value = item.strategyId;
  backtestForm.maxDrawdown = item.maxDrawdown ?? '';
  backtestForm.notes = item.notes ?? '';
  backtestForm.pairs = item.pairs;
  backtestForm.profitFactor = item.profitFactor ?? '';
  backtestForm.runAt = toDateTimeLocal(item.runAt);
  backtestForm.timeframe = item.timeframe;
  backtestForm.timerange = item.timerange;
  backtestForm.totalReturn = item.totalReturn ?? '';
  backtestForm.tradeCount = item.tradeCount ?? undefined;
  backtestForm.winRate = item.winRate ?? '';
  backtestModalOpen.value = true;
}

function backtestPayload(): QuantBacktestInput {
  return {
    ...backtestForm,
    runAt: new Date(backtestForm.runAt).toISOString(),
    totalReturn: backtestForm.totalReturn || null,
    winRate: backtestForm.winRate || null,
    maxDrawdown: backtestForm.maxDrawdown || null,
    profitFactor: backtestForm.profitFactor || null,
    notes: backtestForm.notes?.trim() || null,
  };
}

async function saveBacktest() {
  if (!backtestForm.runAt || !backtestForm.timerange.trim() || !backtestForm.pairs.trim()) {
    setStatus('运行时间、测试区间和交易对不能为空。', 'error');
    return;
  }
  backtestSaving.value = true;
  try {
    await (editingBacktest.value ? updateQuantBacktest(editingBacktest.value.id, {
        ...backtestPayload(),
        version: editingBacktest.value.version,
      }) : createQuantBacktest(backtestStrategyId.value, backtestPayload()));
    backtestModalOpen.value = false;
    setStatus('回测记录已保存。');
    await openDetail(backtestStrategyId.value);
    await load();
  } catch (error) {
    setStatus(errorMessage(error), 'error');
  } finally {
    backtestSaving.value = false;
  }
}

function removeBacktest(item: QuantBacktest) {
  Modal.confirm({
    cancelText: '取消',
    content: '删除后这条回测记录无法恢复。',
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除回测记录？',
    async onOk() {
      try {
        await deleteQuantBacktest(item.id);
        setStatus('回测记录已删除。');
        await openDetail(item.strategyId);
        await load();
      } catch (error) {
        setStatus(errorMessage(error), 'error');
      }
    },
  });
}

function formatPercent(value: null | string | undefined) {
  return value === null || value === undefined || value === '' ? '—' : `${value}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value));
}

async function load() {
  loading.value = true;
  failure.value = '';
  try {
    strategies.value = await listQuantStrategies();
  } catch (error) {
    failure.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <PageFrame kicker="QUANT STRATEGIES" title="Quant 策略" subtitle="管理策略快照，记录每次手工回测结果。">
    <template #actions>
      <Button type="primary" @click="openCreateStrategy"><PlusOutlined />新建策略</Button>
    </template>

    <Alert v-if="status" :type="statusTone" show-icon :message="status" style="margin-bottom: 1rem;" />
    <section class="market-panel ledger-filters quant-filters">
      <Input v-model:value="query" allow-clear placeholder="搜索策略名、文件名或摘要" aria-label="搜索策略名、文件名或摘要" />
    </section>

    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <Alert v-else-if="failure" type="error" show-icon :message="failure"><template #extra><Button @click="load">重试</Button></template></Alert>
    <section v-else class="market-panel ledger-panel">
      <div class="ledger-summary"><strong>{{ filteredStrategies.length }}</strong><span>个策略</span></div>
      <div v-if="filteredStrategies.length > 0" class="ledger-table-wrap">
        <table class="ledger-table quant-table">
          <thead><tr><th>策略</th><th>周期</th><th>类型</th><th>摘要</th><th>最近回测</th><th>更新时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in filteredStrategies" :key="item.id">
              <td><button class="table-link" :data-testid="`strategy-detail-${item.id}`" @click="openDetail(item.id)">{{ item.name }}</button><small>{{ item.fileName }}</small></td>
              <td>{{ item.timeframe }}</td>
              <td><Tag :color="item.isExample ? 'gold' : 'green'">{{ item.isExample ? '示例' : '策略' }}</Tag></td>
              <td class="quant-summary">{{ item.summary || '—' }}</td>
              <td><span v-if="item.latestBacktest">收益 {{ formatPercent(item.latestBacktest.totalReturn) }} · 胜率 {{ formatPercent(item.latestBacktest.winRate) }}</span><span v-else class="muted">暂无回测</span></td>
              <td>{{ formatDate(item.updatedAt) }}</td>
              <td class="quant-actions"><Button size="small" @click="openDetail(item.id)">详情</Button><Button size="small" danger @click="removeStrategy(item)">删除</Button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Empty v-else description="暂无量化策略" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </section>

    <Drawer v-model:open="detailOpen" width="min(66rem, 96vw)" :destroy-on-close="true">
      <template #title><div v-if="detail" class="detail-title"><span>QUANT STRATEGY · {{ detail.fileName }}</span><strong>{{ detail.name }}</strong></div><span v-else>策略详情</span></template>
      <template #extra v-if="detail"><Button @click="openEditStrategy(detail)">编辑</Button><Button danger @click="removeStrategy(detail)">删除</Button></template>
      <Skeleton v-if="detailLoading" active :paragraph="{ rows: 12 }" />
      <div v-else-if="detail" class="quant-detail">
        <section class="market-panel quant-meta"><Tag :color="detail.isExample ? 'gold' : 'green'">{{ detail.isExample ? '示例策略' : '实盘策略快照' }}</Tag><Tag>周期 {{ detail.timeframe }}</Tag><Tag>版本 {{ detail.version }}</Tag><span class="muted">更新于 {{ formatDate(detail.updatedAt) }}</span></section>
        <section class="market-panel quant-explanation"><div class="page-kicker">STRATEGY NOTES</div><MarkdownDocument :markdown="detail.explanation" /></section>
        <section class="market-panel">
          <div class="quant-section-heading"><div><div class="page-kicker">SOURCE SNAPSHOT</div><h3>Python 源码</h3></div></div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <pre class="quant-source" v-html="highlightedSource"></pre>
        </section>
        <section class="market-panel"><div class="quant-section-heading"><div><div class="page-kicker">BACKTEST LOG</div><h3>回测记录</h3></div><Button type="primary" @click="openCreateBacktest">新增回测</Button></div><div v-if="detail.backtests.length > 0" class="ledger-table-wrap"><table class="ledger-table quant-table"><thead><tr><th>运行时间</th><th>区间 / 交易对</th><th>交易次数</th><th>收益率</th><th>胜率</th><th>最大回撤</th><th>盈利因子</th><th>操作</th></tr></thead><tbody><tr v-for="item in detail.backtests" :key="item.id"><td>{{ formatDate(item.runAt) }}</td><td>{{ item.timerange }}<small>{{ item.pairs }} · {{ item.timeframe }}</small></td><td>{{ item.tradeCount ?? '—' }}</td><td>{{ formatPercent(item.totalReturn) }}</td><td>{{ formatPercent(item.winRate) }}</td><td>{{ formatPercent(item.maxDrawdown) }}</td><td>{{ item.profitFactor ?? '—' }}</td><td class="quant-actions"><Button size="small" @click="openEditBacktest(item)">编辑</Button><Button size="small" danger @click="removeBacktest(item)">删除</Button></td></tr></tbody></table></div><Empty v-else description="暂无手工回测记录" :image="Empty.PRESENTED_IMAGE_SIMPLE" /></section>
      </div>
    </Drawer>

    <Modal v-model:open="strategyModalOpen" :title="editingStrategy ? '编辑量化策略' : '新建量化策略'" :confirm-loading="strategySaving" width="min(58rem, 94vw)" @ok="saveStrategy">
      <Form layout="vertical" class="quant-form"><FormItem label="策略名"><Input v-model:value="strategyForm.name" placeholder="例如 FirstStrategy" /></FormItem><FormItem label="原文件名"><Input v-model:value="strategyForm.fileName" placeholder="例如 FirstStrategy.py" /></FormItem><FormItem label="周期"><Input v-model:value="strategyForm.timeframe" placeholder="例如 5m" /></FormItem><FormItem label="摘要"><Input.TextArea v-model:value="strategyForm.summary" :rows="2" /></FormItem><FormItem label="结构化讲解 Markdown"><Input.TextArea v-model:value="strategyForm.explanation" :rows="8" /></FormItem><FormItem label="Python 源码"><Input.TextArea v-model:value="strategyForm.sourceCode" :rows="12" /></FormItem><label class="quant-checkbox"><input v-model="strategyForm.isExample" type="checkbox" /> 标记为示例策略</label></Form>
    </Modal>

    <Modal v-model:open="backtestModalOpen" :title="editingBacktest ? '编辑回测记录' : '新增回测记录'" :confirm-loading="backtestSaving" width="min(48rem, 94vw)" @ok="saveBacktest">
      <Form layout="vertical" class="quant-form"><FormItem label="运行时间"><Input v-model:value="backtestForm.runAt" type="datetime-local" /></FormItem><FormItem label="测试区间"><Input v-model:value="backtestForm.timerange" placeholder="例如 20250101-20260101" /></FormItem><FormItem label="交易对"><Input v-model:value="backtestForm.pairs" placeholder="例如 BTC/USDT, ETH/USDT" /></FormItem><FormItem label="周期"><Input v-model:value="backtestForm.timeframe" /></FormItem><div class="quant-form-grid"><FormItem label="交易次数"><InputNumber v-model:value="backtestForm.tradeCount" :min="0" style="width: 100%;" /></FormItem><FormItem label="总收益率 (%)"><Input v-model:value="backtestForm.totalReturn" placeholder="可留空，例如 12.5" /></FormItem><FormItem label="胜率 (%)"><Input v-model:value="backtestForm.winRate" placeholder="可留空，例如 55" /></FormItem><FormItem label="最大回撤 (%)"><Input v-model:value="backtestForm.maxDrawdown" placeholder="可留空，例如 8.2" /></FormItem><FormItem label="盈利因子"><Input v-model:value="backtestForm.profitFactor" placeholder="可留空，例如 1.35" /></FormItem></div><FormItem label="备注"><Input.TextArea v-model:value="backtestForm.notes" :rows="3" /></FormItem></Form>
    </Modal>
  </PageFrame>
</template>

<style scoped>
.table-link { background: transparent; border: 0; color: var(--md-accent); cursor: pointer; font-weight: 650; padding: 0; text-align: left; }
.ledger-table td small { color: var(--md-muted); display: block; margin-top: 0.25rem; }
.quant-summary { max-width: 20rem; }
.quant-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.quant-meta { align-items: center; display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; padding: 0.85rem 1rem; }
.quant-explanation { padding: 1.25rem; }
.quant-detail section + section { margin-top: 1rem; }
.quant-section-heading { align-items: center; display: flex; justify-content: space-between; margin-bottom: 0.75rem; }
.quant-section-heading h3 { margin: 0.3rem 0 0; }
.quant-source { background: #142019; border-radius: 0.6rem; color: #d9eadc; max-height: 32rem; overflow: auto; padding: 1rem; white-space: pre-wrap; }
.quant-source :deep(.py-keyword) { color: #f6c76e; }
.quant-source :deep(.py-string) { color: #a8d88b; }
.quant-source :deep(.py-comment) { color: #75917e; font-style: italic; }
.quant-source :deep(.py-number) { color: #e6a5c8; }
.quant-source :deep(.py-builtin) { color: #7dc5e8; }
.quant-source :deep(.py-operator) { color: #d7e3dc; }
.quant-form-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.quant-checkbox { display: flex; gap: 0.45rem; }
@media (max-width: 720px) { .quant-form-grid { grid-template-columns: 1fr; } .quant-table { min-width: 58rem; } }
</style>
