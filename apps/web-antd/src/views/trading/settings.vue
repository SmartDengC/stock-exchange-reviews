<script lang="ts" setup>
import type {
  TradingOption,
  TradingOptionKind,
  TradingOptionsResponse,
} from '#/shared/types/trading';

import { computed, onMounted, reactive, ref } from 'vue';

import { DownloadOutlined, PlusOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Switch,
} from 'ant-design-vue';

import { exportUrl, getTradingOptions, updateTradingOptions } from '#/api';
import PageFrame from '#/components/page-frame.vue';
import { errorMessage } from '#/lib/trading';

const data = ref<null | TradingOptionsResponse>(null);
const loading = ref(true);
const failure = ref('');
const activeAction = ref('');
const status = ref('');
const statusTone = ref<'error' | 'success'>('success');
const rate = ref('7.2');
const from = ref('');
const to = ref('');
const newOption = reactive<{ kind: TradingOptionKind; label: string }>({ kind: 'strategy', label: '' });
const kindLabels: Record<TradingOptionKind, string> = {
  emotion: '情绪',
  error_tag: '错误标签',
  instrument_code: '证券代码',
  strategy: '策略',
  symbol: '标的',
  timeframe: '周期',
};
const kindOptions = Object.entries(kindLabels).map(([value, label]) => ({ label, value }));
const grouped = computed(() => Object.fromEntries(
  (Object.keys(kindLabels) as TradingOptionKind[]).map((kind) => [kind, (data.value?.options ?? []).filter((item) => item.kind === kind)]),
) as Record<TradingOptionKind, TradingOption[]>);
const downloadUrl = computed(() => exportUrl({ from: from.value || undefined, to: to.value || undefined }));

async function load() {
  loading.value = true;
  failure.value = '';
  try {
    data.value = await getTradingOptions();
    rate.value = data.value.settings.defaultUsdtCnyRate;
  } catch (error) {
    failure.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function perform(action: string, success: string, update: () => Promise<unknown>) {
  if (activeAction.value) return;
  activeAction.value = action;
  status.value = '';
  try {
    await update();
    status.value = success;
    statusTone.value = 'success';
    await load();
  } catch (error) {
    status.value = errorMessage(error);
    statusTone.value = 'error';
  } finally {
    activeAction.value = '';
  }
}

function saveRate() {
  return perform('rate', '默认汇率已保存；历史交易不会重算。', () => updateTradingOptions({ defaultUsdtCnyRate: rate.value }));
}

function addOption() {
  const label = newOption.label.trim();
  if (!label) {
    status.value = '请输入选项内容后再新增。';
    statusTone.value = 'error';
    return;
  }
  return perform('add', '选项已新增。', async () => {
    await updateTradingOptions({ options: [{ active: true, kind: newOption.kind, label, sortOrder: grouped.value[newOption.kind].length }] });
    newOption.label = '';
  });
}

function toggleOption(item: TradingOption) {
  return perform(item.id, `${item.label}已${item.active ? '停用' : '启用'}。`, () => updateTradingOptions({
    options: [{ active: !item.active, kind: item.kind, label: item.label, sortOrder: item.sortOrder }],
  }));
}

onMounted(load);
</script>

<template>
  <PageFrame kicker="SETTINGS & EXPORT" title="设置与导出" subtitle="维护录入字典、默认汇率和可携带的数据备份。">
    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <Alert v-else-if="failure" type="error" show-icon :message="failure" />
    <section v-else class="settings-grid">
      <Alert v-if="status" :type="statusTone" show-icon :message="status" />
      <article class="market-panel">
        <header class="panel-heading"><div><div class="page-kicker">FX SNAPSHOT</div><h2>默认 USDT/CNY 汇率</h2></div></header>
        <p class="muted">只用于新交易的默认值；每笔交易保存自己的汇率，修改这里不会改变历史盈亏。</p>
        <div class="settings-inline"><InputNumber v-model:value="rate" string-mode :min="0" :step="0.01" aria-label="默认汇率" /><Button type="primary" :loading="activeAction === 'rate'" @click="saveRate">保存汇率</Button></div>
      </article>

      <article class="market-panel">
        <header class="panel-heading"><div><div class="page-kicker">DATA PORTABILITY</div><h2>导出 Excel</h2></div></header>
        <p class="muted">导出逐笔交易、日复盘和统计摘要；截图以私有链接列出。</p>
        <div class="settings-inline"><DatePicker v-model:value="from" value-format="YYYY-MM-DD" placeholder="开始日期" /><DatePicker v-model:value="to" value-format="YYYY-MM-DD" placeholder="结束日期" /><Button type="primary" :href="downloadUrl"><DownloadOutlined />下载 Excel</Button></div>
      </article>

      <article class="market-panel settings-options">
        <header class="panel-heading"><div><div class="page-kicker">INPUT DICTIONARY</div><h2>录入字典</h2></div></header>
        <div class="settings-inline"><Select v-model:value="newOption.kind" :options="kindOptions" /><Input v-model:value="newOption.label" placeholder="例：趋势突破" @press-enter="addOption" /><Button :loading="activeAction === 'add'" @click="addOption"><PlusOutlined />新增</Button></div>
        <div class="option-groups">
          <section v-for="(items, kind) in grouped" :key="kind">
            <h3>{{ kindLabels[kind] }}</h3>
            <div class="option-list">
              <label v-for="item in items" :key="item.id"><span>{{ item.label }}</span><Switch :checked="item.active" :loading="activeAction === item.id" @change="toggleOption(item)" /></label>
            </div>
          </section>
        </div>
      </article>
    </section>
  </PageFrame>
</template>
