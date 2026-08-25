<script lang="ts" setup>
import type { TradingOptionsResponse } from '#/shared/types/trading';

import { onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  InputNumber,
  Skeleton,
} from 'ant-design-vue';

import { getTradingOptions, updateTradingOptions } from '#/api';
import PageFrame from '#/components/page-frame.vue';
import { errorMessage } from '#/lib/trading';

const data = ref<null | TradingOptionsResponse>(null);
const loading = ref(true);
const failure = ref('');
const activeAction = ref('');
const status = ref('');
const statusTone = ref<'error' | 'success'>('success');
const rate = ref('7.2');

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

onMounted(load);
</script>

<template>
  <PageFrame kicker="SETTINGS" title="设置" subtitle="默认汇率。">
    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <Alert v-else-if="failure" type="error" show-icon :message="failure" />
    <section v-else>
      <Alert v-if="status" :type="statusTone" show-icon :message="status" />
      <article class="market-panel">
        <header class="panel-heading"><div><div class="page-kicker">FX SNAPSHOT</div><h2>默认 USDT/CNY 汇率</h2></div></header>
        <p class="muted">只用于新交易的默认值；每笔交易保存自己的汇率，修改这里不会改变历史盈亏。</p>
        <div class="settings-inline"><InputNumber v-model:value="rate" string-mode :min="0" :step="0.01" aria-label="默认汇率" /><Button type="primary" :loading="activeAction === 'rate'" @click="saveRate">保存汇率</Button></div>
      </article>
    </section>
  </PageFrame>
</template>
