<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { calculateTrade } from "~~/shared/trading-calculator";
import type {
  TradeInput,
  TradeView,
  TradingOptionsResponse,
} from "~~/shared/types/trading";
import { useAccessibleDialog } from "~/composables/use-accessible-dialog";
import {
  blankTrade,
  errorMessage,
  formatMoney,
  formatNumber,
  isoDateTime,
  localDateTime,
} from "~/lib/trading";

const props = defineProps<{
  open: boolean;
  trade?: TradeView | null;
  cloneSource?: TradeView | null;
}>();
const emit = defineEmits<{
  close: [];
  saved: [trade: TradeView];
}>();

const saving = ref(false);
const loadingOptions = ref(false); // 加载选项时的状态
const error = ref("");
const queuedFiles = ref<File[]>([]);
const options = ref<TradingOptionsResponse | null>(null);
const form = reactive<TradeInput>(blankTrade());
const entryLocal = ref("");
const exitLocal = ref("");
const closeButton = ref<HTMLElement | null>(null);
const errorElement = ref<HTMLElement | null>(null);
const initialSnapshot = ref("");
const visible = computed(() => props.open);
const { $api } = useNuxtApp();

function snapshot() {
  return JSON.stringify({ form, entryLocal: entryLocal.value, exitLocal: exitLocal.value, files: queuedFiles.value.map((file) => file.name) });
}

const dirty = computed(() => props.open && Boolean(initialSnapshot.value) && snapshot() !== initialSnapshot.value);

function setNumericField(field: "entryPrice" | "exitPrice" | "positionSize" | "fxToCny" | "plannedRiskAmount" | "fees", event: Event) {
  Object.assign(form, { [field]: (event.target as HTMLInputElement).value });
}

function requestClose() {
  if (dirty.value && !window.confirm("这笔交易还有未保存的修改，确定关闭吗？")) return;
  emit("close");
}

const { dialogRef, onDialogKeydown } = useAccessibleDialog(visible, requestClose, closeButton);

const strategies = computed(() => options.value?.options.filter((item) => item.kind === "strategy" && item.active) ?? []);
const timeframes = computed(() => options.value?.options.filter((item) => item.kind === "timeframe" && item.active) ?? []);
const emotions = computed(() => options.value?.options.filter((item) => item.kind === "emotion" && item.active) ?? []);
const errorTags = computed(() => options.value?.options.filter((item) => item.kind === "error_tag" && item.active) ?? []);
const instrumentCodes = computed(() => options.value?.options.filter((item) => item.kind === "instrument_code" && item.active) ?? []);
const symbols = computed(() => options.value?.options.filter((item) => item.kind === "symbol" && item.active) ?? []);

const preview = computed(() => {
  try {
    return calculateTrade({
      ...form,
      entryAt: isoDateTime(entryLocal.value) ?? form.entryAt,
      exitAt: form.status === "closed" ? isoDateTime(exitLocal.value) : null,
    });
  } catch {
    return null;
  }
});

function resetForm() {
  const rate = options.value?.settings.defaultUsdtCnyRate ?? "7.2";
  let source: TradeInput = blankTrade(rate);
  if (props.cloneSource) {
    source = {
      ...source,
      tradeDate: source.tradeDate,
      instrumentCode: props.cloneSource.instrumentCode,
      symbol: props.cloneSource.symbol,
      market: props.cloneSource.market,
      side: props.cloneSource.side,
      strategy: props.cloneSource.strategy,
      timeframe: props.cloneSource.timeframe,
      positionBasis: props.cloneSource.positionBasis,
      settlementCurrency: props.cloneSource.settlementCurrency,
      fxToCny: props.cloneSource.fxToCny,
    };
  }
  if (props.trade) {
    source = {
      status: props.trade.status,
      tradeDate: props.trade.tradeDate,
      instrumentCode: props.trade.instrumentCode,
      symbol: props.trade.symbol,
      market: props.trade.market,
      side: props.trade.side,
      strategy: props.trade.strategy,
      timeframe: props.trade.timeframe,
      entryAt: props.trade.entryAt,
      exitAt: props.trade.exitAt,
      entryReason: props.trade.entryReason,
      exitReason: props.trade.exitReason,
      entryPrice: props.trade.entryPrice,
      exitPrice: props.trade.exitPrice,
      positionSize: props.trade.positionSize,
      positionBasis: props.trade.positionBasis,
      settlementCurrency: props.trade.settlementCurrency,
      plannedRiskAmount: props.trade.plannedRiskAmount,
      fees: props.trade.fees,
      fxToCny: props.trade.fxToCny,
      executionGrade: props.trade.executionGrade,
      emotion: props.trade.emotion,
      errorTags: [...(props.trade.errorTags ?? [])],
      errorNotes: props.trade.errorNotes,
      didWell: props.trade.didWell,
      nextImprovement: props.trade.nextImprovement,
      version: props.trade.version,
    };
  }
  Object.assign(form, source);
  if (!props.trade) form.version = undefined;
  entryLocal.value = localDateTime(source.entryAt);
  exitLocal.value = localDateTime(source.exitAt);
  queuedFiles.value = [];
  error.value = "";
  initialSnapshot.value = snapshot();
}

watch(() => form.market, (market) => {
  if (props.trade) return;
  if (market === "a_share") {
    form.positionBasis = "quantity";
    form.settlementCurrency = "CNY";
    form.fxToCny = "1";
  } else {
    form.positionBasis = "notional";
    form.settlementCurrency = "USDT";
    form.fxToCny = options.value?.settings.defaultUsdtCnyRate ?? "7.2";
  }
});

watch(() => form.settlementCurrency, (currency) => {
  if (currency === "CNY") form.fxToCny = "1";
});

watch(() => props.open, async (open) => {
  if (!open) return;
  if (!options.value) {
    loadingOptions.value = true;
    try {
      options.value = await $api<TradingOptionsResponse>("/api/trading/options");
    } catch (e) {
      console.error("加载交易选项失败:", e);
    } finally {
      loadingOptions.value = false;
    }
  }
  resetForm();
}, { immediate: true });

function toggleErrorTag(label: string) {
  const tags = form.errorTags ?? [];
  form.errorTags = tags.includes(label) ? tags.filter((item) => item !== label) : [...tags, label];
}

function chooseFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  error.value = "";
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      error.value = "只支持 JPEG、PNG 和 WebP 截图，请重新选择文件";
      continue;
    }
    if (file.size > 15 * 1024 * 1024) {
      error.value = "单张截图不能超过 15 MB，请压缩后重试";
      continue;
    }
    if (queuedFiles.value.length < 10) queuedFiles.value.push(file);
  }
  input.value = "";
}

async function uploadQueued(trade: TradeView) {
  while (queuedFiles.value.length) {
    const file = queuedFiles.value[0]!;
    const body = new FormData();
    body.append("file", file, file.name);
    await $api(`/api/trading/trades/${trade.id}/attachments`, {
      method: "POST",
      body,
    });
    queuedFiles.value.shift();
  }
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    const payload: TradeInput = {
      ...form,
      entryAt: isoDateTime(entryLocal.value) ?? "",
      exitAt: form.status === "closed" ? isoDateTime(exitLocal.value) : null,
      exitPrice: form.status === "closed" ? form.exitPrice : null,
      exitReason: form.status === "closed" ? form.exitReason : null,
    };
    const trade = props.trade
      ? await $api<TradeView>(`/api/trading/trades/${props.trade.id}`, { method: "PATCH", body: payload })
      : await $api<TradeView>("/api/trading/trades", { method: "POST", body: payload });
    form.version = trade.version;
    try {
      await uploadQueued(trade);
    } catch (cause) {
      emit("saved", trade);
      error.value = `交易已保存，但截图上传失败：${errorMessage(cause)}`;
      return;
    }
    emit("saved", trade);
    initialSnapshot.value = snapshot();
    emit("close");
  } catch (cause) {
    error.value = errorMessage(cause);
    await nextTick();
    errorElement.value?.focus();
  } finally {
    saving.value = false;
  }
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = "";
}

onMounted(() => window.addEventListener("beforeunload", warnBeforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", warnBeforeUnload));
onBeforeRouteLeave(() => !dirty.value || window.confirm("这笔交易还有未保存的修改，确定离开吗？"));
</script>

<template>
  <Teleport to="body">
    <Transition name="review-overlay">
      <div v-if="open" class="trade-modal-backdrop">
        <button type="button" class="trade-modal-dismiss" aria-label="关闭交易表单" @click="requestClose" />
        <section
          ref="dialogRef"
          class="trade-form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trade-form-title"
          tabindex="-1"
          @keydown="onDialogKeydown"
        >
          <header class="trade-modal-header">
            <div>
              <span class="eyebrow">{{ trade ? "EDIT TRADE" : cloneSource ? "CLONE TRADE" : "NEW TRADE" }}</span>
              <h2 id="trade-form-title">{{ trade ? "编辑交易记录" : "记录一笔交易" }}</h2>
            </div>
            <button ref="closeButton" type="button" class="trade-modal-close" aria-label="关闭" @click="requestClose">×</button>
          </header>

          <form id="trade-form" class="trade-form-body" autocomplete="off" @submit.prevent="save">
            <div class="trade-form-main">
              <!-- 加载选项时的提示 -->
              <div v-if="loadingOptions" class="trade-form-loading" aria-live="polite">
                <p>正在加载交易选项…</p>
              </div>
              
              <section v-else class="trade-form-section">
                <div class="trade-section-title"><span>01</span><h3>基本信息</h3></div>
                <div class="trade-form-grid">
                  <label>交易状态<select v-model="form.status" name="status"><option value="closed">已平仓</option><option value="open">未平仓</option></select></label>
                  <label>交易日期<input v-model="form.tradeDate" name="tradeDate" type="date" required></label>
                  <label>市场<select v-model="form.market" name="market"><option value="crypto">加密</option><option value="a_share">A 股</option></select></label>
                  <label>方向<select v-model="form.side" name="side"><option value="long">做多</option><option value="short">做空</option></select></label>
                  <label>合约/证券代码<input v-model="form.instrumentCode" name="instrumentCode" list="trade-instrument-codes" spellcheck="false" placeholder="例：MUUSDT / 159316…"><datalist id="trade-instrument-codes"><option v-for="item in instrumentCodes" :key="item.id" :value="item.label" /></datalist></label>
                  <label>标的<input v-model="form.symbol" name="symbol" list="trade-symbols" required placeholder="例：黄金…"><datalist id="trade-symbols"><option v-for="item in symbols" :key="item.id" :value="item.label" /></datalist></label>
                  <label>策略<input v-model="form.strategy" name="strategy" list="trade-strategies" required><datalist id="trade-strategies"><option v-for="item in strategies" :key="item.id" :value="item.label" /></datalist></label>
                  <label>周期<input v-model="form.timeframe" name="timeframe" list="trade-timeframes" required><datalist id="trade-timeframes"><option v-for="item in timeframes" :key="item.id" :value="item.label" /></datalist></label>
                </div>
              </section>

              <section class="trade-form-section">
                <div class="trade-section-title"><span>02</span><h3>开平仓与资金</h3></div>
                <div class="trade-form-grid">
                  <label>开仓时间<input v-model="entryLocal" name="entryAt" type="datetime-local" required></label>
                  <label>开仓价<input :value="form.entryPrice" name="entryPrice" type="number" inputmode="decimal" step="any" required placeholder="例：0.0000…" @input="setNumericField('entryPrice', $event)"></label>
                  <label v-if="form.status === 'closed'">平仓时间<input v-model="exitLocal" name="exitAt" type="datetime-local" required></label>
                  <label v-if="form.status === 'closed'">平仓价<input :value="form.exitPrice" name="exitPrice" type="number" inputmode="decimal" step="any" required placeholder="例：0.0000…" @input="setNumericField('exitPrice', $event)"></label>
                  <label>仓位口径<select v-model="form.positionBasis" name="positionBasis"><option value="notional">名义金额</option><option value="quantity">数量</option></select></label>
                  <label>仓位/名义金额<input :value="form.positionSize" name="positionSize" type="number" inputmode="decimal" step="any" required placeholder="例：1000…" @input="setNumericField('positionSize', $event)"></label>
                  <label>结算币种<select v-model="form.settlementCurrency" name="settlementCurrency"><option value="USDT">USDT</option><option value="CNY">CNY</option><option value="USD">USD</option></select></label>
                  <label>逐笔人民币汇率<input :value="form.fxToCny" name="fxToCny" type="number" inputmode="decimal" step="any" :disabled="form.settlementCurrency === 'CNY'" required @input="setNumericField('fxToCny', $event)"></label>
                  <label>计划风险金额<input :value="form.plannedRiskAmount" name="plannedRiskAmount" type="number" inputmode="decimal" step="any" placeholder="例：500…" @input="setNumericField('plannedRiskAmount', $event)"></label>
                  <label>手续费税费<input :value="form.fees" name="fees" type="number" inputmode="decimal" step="any" required @input="setNumericField('fees', $event)"></label>
                </div>
                <label class="trade-full-field">入场理由<textarea v-model="form.entryReason" name="entryReason" rows="3" required placeholder="例：突破关键阻力后回踩确认…" /></label>
                <label v-if="form.status === 'closed'" class="trade-full-field">出场理由<textarea v-model="form.exitReason" name="exitReason" rows="3" required placeholder="例：触及计划止盈位…" /></label>
              </section>

              <section class="trade-form-section">
                <div class="trade-section-title"><span>03</span><h3>执行复盘</h3></div>
                <div class="trade-form-grid">
                  <label>执行评分<select v-model="form.executionGrade" name="executionGrade"><option :value="null">未评分</option><option value="A">A · 完全按计划</option><option value="B">B · 有瑕疵</option><option value="C">C · 明显失控</option></select></label>
                  <label>情绪状态<input v-model="form.emotion" name="emotion" list="trade-emotions" placeholder="例：平静 / 犹豫…"><datalist id="trade-emotions"><option v-for="item in emotions" :key="item.id" :value="item.label" /></datalist></label>
                </div>
                <div class="trade-tag-field">
                  <span>错误标签</span>
                  <div><button v-for="item in errorTags" :key="item.id" type="button" :class="{ active: form.errorTags?.includes(item.label) }" :aria-pressed="form.errorTags?.includes(item.label)" @click="toggleErrorTag(item.label)">{{ item.label }}</button></div>
                </div>
                <label class="trade-full-field">错误复盘<textarea v-model="form.errorNotes" name="errorNotes" rows="4" placeholder="例：保留当时的原始判断、失误过程和触发条件…" /></label>
                <div class="trade-form-grid trade-text-grid">
                  <label>做对了什么<textarea v-model="form.didWell" name="didWell" rows="4" /></label>
                  <label>下次改进<textarea v-model="form.nextImprovement" name="nextImprovement" rows="4" /></label>
                </div>
              </section>

              <section class="trade-form-section">
                <div class="trade-section-title"><span>04</span><h3>行情截图</h3></div>
                <label class="trade-upload-zone">
                  <input name="screenshots" type="file" accept="image/jpeg,image/png,image/webp" multiple @change="chooseFiles">
                  <b>选择截图</b>
                  <span>最多 10 张，每张不超过 15&nbsp;MB；支持 JPEG、PNG、WebP</span>
                </label>
                <div v-if="queuedFiles.length" class="queued-files">
                  <span v-for="(file, index) in queuedFiles" :key="`${file.name}-${index}`">{{ file.name }}<button type="button" :aria-label="`移除 ${file.name}`" @click="queuedFiles.splice(index, 1)">×</button></span>
                </div>
              </section>
            </div>

            <aside class="trade-preview-panel" aria-live="polite">
              <span class="eyebrow">LIVE PREVIEW</span>
              <h3>交易结果预览</h3>
              <dl>
                <div><dt>毛盈亏</dt><dd>{{ preview?.grossPnl ? formatNumber(preview.grossPnl, 4) : "—" }} {{ form.settlementCurrency }}</dd></div>
                <div><dt>净盈亏</dt><dd :class="{ positive: preview?.isWinning, negative: preview?.isWinning === false }">{{ preview?.netPnl ? formatNumber(preview.netPnl, 4) : "—" }} {{ form.settlementCurrency }}</dd></div>
                <div><dt>人民币盈亏</dt><dd>{{ formatMoney(preview?.pnlCny) }}</dd></div>
                <div><dt>盈亏 R 倍</dt><dd>{{ preview?.rMultiple ? `${formatNumber(preview.rMultiple)}R` : "—" }}</dd></div>
                <div><dt>持仓时长</dt><dd>{{ preview?.holdMinutes !== null && preview?.holdMinutes !== undefined ? `${preview.holdMinutes} 分钟` : "—" }}</dd></div>
              </dl>
              <p>结果由服务端按逐笔汇率重新计算，不能直接修改。</p>
            </aside>
          </form>

          <footer class="trade-modal-footer">
            <p v-if="error" ref="errorElement" class="form-error" role="alert" aria-live="polite" tabindex="-1">{{ error }}</p>
            <div>
              <button type="button" class="trading-secondary-button" @click="requestClose">取消</button>
              <button type="submit" form="trade-form" class="trading-primary-button" :disabled="saving">{{ saving ? "正在保存…" : "保存交易" }}</button>
            </div>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
