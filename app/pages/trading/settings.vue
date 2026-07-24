<script setup lang="ts">
import type { TradingOptionKind, TradingOptionsResponse } from "~~/shared/types/trading";
import { errorMessage } from "~/lib/trading";

definePageMeta({ middleware: "trading-auth" });
useSeoMeta({ title: "设置与导出 · 私有交易复盘", robots: "noindex, nofollow" });

const { data, pending, error, refresh } = await useFetch<TradingOptionsResponse>("/api/trading/options");
const rate = ref("7.2");
const newOption = reactive<{ kind: TradingOptionKind; label: string }>({ kind: "strategy", label: "" });
const status = ref("");
const from = ref("");
const to = ref("");

watch(data, (value) => {
  if (value) rate.value = value.settings.defaultUsdtCnyRate;
}, { immediate: true });

const grouped = computed(() => ({
  strategy: data.value?.options.filter((item) => item.kind === "strategy") ?? [],
  timeframe: data.value?.options.filter((item) => item.kind === "timeframe") ?? [],
  emotion: data.value?.options.filter((item) => item.kind === "emotion") ?? [],
  error_tag: data.value?.options.filter((item) => item.kind === "error_tag") ?? [],
}));

async function saveRate() {
  status.value = "";
  try {
    await $fetch("/api/trading/options", { method: "PATCH", body: { defaultUsdtCnyRate: rate.value } });
    status.value = "默认汇率已保存；历史交易不会重算。";
    await refresh();
  } catch (cause) {
    status.value = errorMessage(cause);
  }
}

async function addOption() {
  if (!newOption.label.trim()) return;
  await $fetch("/api/trading/options", {
    method: "PATCH",
    body: { options: [{ kind: newOption.kind, label: newOption.label.trim(), active: true, sortOrder: grouped.value[newOption.kind].length }] },
  });
  newOption.label = "";
  await refresh();
}

async function toggleOption(item: TradingOptionsResponse["options"][number]) {
  await $fetch("/api/trading/options", {
    method: "PATCH",
    body: { options: [{ kind: item.kind, label: item.label, active: !item.active, sortOrder: item.sortOrder }] },
  });
  await refresh();
}

const exportUrl = computed(() => {
  const query = new URLSearchParams();
  if (from.value) query.set("from", from.value);
  if (to.value) query.set("to", to.value);
  return `/api/trading/export.xlsx${query.size ? `?${query}` : ""}`;
});
</script>

<template>
  <TradingShell eyebrow="SETTINGS & EXPORT" title="设置与导出" subtitle="维护录入字典、默认汇率和可携带的数据备份。">
    <div v-if="pending" class="trading-loading">正在载入设置…</div>
    <div v-else-if="error" class="trading-error">{{ error.message || "读取设置失败" }}</div>
    <section v-else class="settings-grid">
      <article class="trading-panel">
        <header><div><span class="eyebrow">FX SNAPSHOT</span><h2>默认 USDT/CNY 汇率</h2></div></header>
        <p class="panel-copy">只用于新交易的默认值；每笔交易会保存自己的汇率，修改这里不会改变历史盈亏。</p>
        <div class="settings-inline-form"><input v-model="rate" inputmode="decimal"><button class="trading-primary-button" type="button" @click="saveRate">保存汇率</button></div>
        <p v-if="status" class="settings-status">{{ status }}</p>
      </article>

      <article class="trading-panel">
        <header><div><span class="eyebrow">DATA PORTABILITY</span><h2>导出 Excel</h2></div></header>
        <p class="panel-copy">导出逐笔交易、日复盘和公式驱动的统计摘要；截图以私有链接列出。</p>
        <div class="settings-export-range"><label>开始<input v-model="from" type="date"></label><label>结束<input v-model="to" type="date"></label></div>
        <a class="trading-primary-button settings-download" :href="exportUrl">下载 Excel 备份</a>
      </article>

      <article class="trading-panel settings-options-panel">
        <header><div><span class="eyebrow">INPUT DICTIONARY</span><h2>录入字典</h2></div></header>
        <div class="settings-add-option">
          <select v-model="newOption.kind"><option value="strategy">策略</option><option value="timeframe">周期</option><option value="emotion">情绪</option><option value="error_tag">错误标签</option></select>
          <input v-model="newOption.label" placeholder="输入新选项" @keydown.enter.prevent="addOption">
          <button class="trading-secondary-button" type="button" @click="addOption">新增</button>
        </div>
        <div class="option-groups">
          <section v-for="(items, kind) in grouped" :key="kind">
            <h3>{{ { strategy: "策略", timeframe: "周期", emotion: "情绪", error_tag: "错误标签" }[kind] }}</h3>
            <div><button v-for="item in items" :key="item.id" type="button" :class="{ inactive: !item.active }" @click="toggleOption(item)">{{ item.label }}<span>{{ item.active ? "启用" : "停用" }}</span></button></div>
          </section>
        </div>
      </article>
    </section>
  </TradingShell>
</template>
