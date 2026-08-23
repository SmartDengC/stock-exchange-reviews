<script setup lang="ts">
import type { TradingOptionKind, TradingOptionsResponse } from "~~/shared/types/trading";
import { errorMessage } from "~/lib/trading";

useSeoMeta({ title: "设置与导出 · 私有交易复盘", robots: "noindex, nofollow" });

const { data, pending, error, refresh } = useFetch<TradingOptionsResponse>("/api/trading/options", {
  lazy: true,
  server: false,
});
const rate = ref("7.2");
const newOption = reactive<{ kind: TradingOptionKind; label: string }>({ kind: "strategy", label: "" });
const status = ref("");
const statusTone = ref<"success" | "error">("success");
const activeAction = ref("");
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
  instrument_code: data.value?.options.filter((item) => item.kind === "instrument_code") ?? [],
  symbol: data.value?.options.filter((item) => item.kind === "symbol") ?? [],
}));

async function saveRate() {
  if (activeAction.value) return;
  activeAction.value = "rate";
  status.value = "";
  try {
    await $fetch("/api/trading/options", { method: "PATCH", body: { defaultUsdtCnyRate: rate.value } });
    status.value = "默认汇率已保存；历史交易不会重算。";
    statusTone.value = "success";
    await refresh();
  } catch (cause) {
    status.value = `${errorMessage(cause)}，请检查汇率后重试`;
    statusTone.value = "error";
  } finally {
    activeAction.value = "";
  }
}

async function addOption() {
  if (activeAction.value) return;
  if (!newOption.label.trim()) {
    status.value = "请输入选项内容后再新增。";
    statusTone.value = "error";
    return;
  }
  activeAction.value = "add";
  status.value = "";
  try {
    await $fetch("/api/trading/options", {
      method: "PATCH",
      body: { options: [{ kind: newOption.kind, label: newOption.label.trim(), active: true, sortOrder: grouped.value[newOption.kind].length }] },
    });
    newOption.label = "";
    status.value = "选项已新增。";
    statusTone.value = "success";
    await refresh();
  } catch (cause) {
    status.value = `${errorMessage(cause)}，请检查选项后重试`;
    statusTone.value = "error";
  } finally {
    activeAction.value = "";
  }
}

async function toggleOption(item: TradingOptionsResponse["options"][number]) {
  if (activeAction.value) return;
  activeAction.value = item.id;
  status.value = "";
  try {
    await $fetch("/api/trading/options", {
      method: "PATCH",
      body: { options: [{ kind: item.kind, label: item.label, active: !item.active, sortOrder: item.sortOrder }] },
    });
    status.value = `${item.label}已${item.active ? "停用" : "启用"}。`;
    statusTone.value = "success";
    await refresh();
  } catch (cause) {
    status.value = `${errorMessage(cause)}，请重试`;
    statusTone.value = "error";
  } finally {
    activeAction.value = "";
  }
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
    <div v-if="pending" class="trading-loading" role="status" aria-live="polite">正在载入设置…</div>
    <div v-else-if="error" class="trading-error" role="alert" aria-live="polite">{{ error.message || "读取设置失败，请刷新页面后重试" }}</div>
    <section v-else class="settings-grid">
      <p v-if="status" :class="['settings-status', `is-${statusTone}`]" :role="statusTone === 'error' ? 'alert' : 'status'" aria-live="polite">{{ status }}</p>
      <article class="trading-panel">
        <header><div><span class="eyebrow">FX SNAPSHOT</span><h2>默认 USDT/CNY 汇率</h2></div></header>
        <p class="panel-copy">只用于新交易的默认值；每笔交易会保存自己的汇率，修改这里不会改变历史盈亏。</p>
        <div class="settings-inline-form"><label>默认汇率<input :value="rate" name="defaultUsdtCnyRate" type="number" inputmode="decimal" step="any" autocomplete="off" @input="rate = ($event.target as HTMLInputElement).value"></label><button class="trading-primary-button" type="button" :disabled="Boolean(activeAction)" @click="saveRate">{{ activeAction === "rate" ? "正在保存…" : "保存汇率" }}</button></div>
      </article>

      <article class="trading-panel">
        <header><div><span class="eyebrow">DATA PORTABILITY</span><h2>导出 Excel</h2></div></header>
        <p class="panel-copy">导出逐笔交易、日复盘和公式驱动的统计摘要；截图以私有链接列出。</p>
        <div class="settings-export-range"><label>开始<input v-model="from" name="exportFrom" type="date" autocomplete="off"></label><label>结束<input v-model="to" name="exportTo" type="date" autocomplete="off"></label></div>
        <a class="trading-primary-button settings-download" :href="exportUrl">下载 Excel 备份</a>
      </article>

      <article class="trading-panel settings-options-panel">
        <header><div><span class="eyebrow">INPUT DICTIONARY</span><h2>录入字典</h2></div></header>
        <div class="settings-add-option">
          <label class="sr-only" for="option-kind">选项类型</label>
          <select id="option-kind" v-model="newOption.kind" name="optionKind" autocomplete="off"><option value="strategy">策略</option><option value="timeframe">周期</option><option value="emotion">情绪</option><option value="error_tag">错误标签</option><option value="instrument_code">证券代码</option><option value="symbol">标的</option></select>
          <label class="sr-only" for="option-label">新选项内容</label>
          <input id="option-label" v-model="newOption.label" name="optionLabel" autocomplete="off" placeholder="例：趋势突破…" @keydown.enter.prevent="addOption">
          <button class="trading-secondary-button" type="button" :disabled="Boolean(activeAction)" @click="addOption">{{ activeAction === "add" ? "正在新增…" : "新增" }}</button>
        </div>
        <div class="option-groups">
          <section v-for="(items, kind) in grouped" :key="kind">
            <h3>{{ { strategy: "策略", timeframe: "周期", emotion: "情绪", error_tag: "错误标签", instrument_code: "证券代码", symbol: "标的" }[kind] }}</h3>
            <div><button v-for="item in items" :key="item.id" type="button" :class="{ inactive: !item.active }" :aria-pressed="item.active" :disabled="Boolean(activeAction)" @click="toggleOption(item)">{{ item.label }}<span>{{ activeAction === item.id ? "处理中…" : item.active ? "启用" : "停用" }}</span></button></div>
          </section>
        </div>
      </article>
    </section>
  </TradingShell>
</template>
