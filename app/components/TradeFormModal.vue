<script setup lang="ts">
import { upload } from "@vercel/blob/client";
import { calculateTrade } from "~~/shared/trading-calculator";
import type {
  TradeInput,
  TradeView,
  TradingOptionsResponse,
} from "~~/shared/types/trading";
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
const error = ref("");
const queuedFiles = ref<File[]>([]);
const options = ref<TradingOptionsResponse | null>(null);
const form = reactive<TradeInput>(blankTrade());
const entryLocal = ref("");
const exitLocal = ref("");

const strategies = computed(() => options.value?.options.filter((item) => item.kind === "strategy" && item.active) ?? []);
const timeframes = computed(() => options.value?.options.filter((item) => item.kind === "timeframe" && item.active) ?? []);
const emotions = computed(() => options.value?.options.filter((item) => item.kind === "emotion" && item.active) ?? []);
const errorTags = computed(() => options.value?.options.filter((item) => item.kind === "error_tag" && item.active) ?? []);

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
      tradeDate: new Date().toISOString().slice(0, 10),
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
      updatedAt: props.trade.updatedAt,
    };
  }
  Object.assign(form, source);
  entryLocal.value = localDateTime(source.entryAt);
  exitLocal.value = localDateTime(source.exitAt);
  queuedFiles.value = [];
  error.value = "";
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
    options.value = await $fetch<TradingOptionsResponse>("/api/trading/options").catch(() => null);
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
      error.value = "只支持 JPEG、PNG 和 WebP 截图";
      continue;
    }
    if (file.size > 15 * 1024 * 1024) {
      error.value = "单张截图不能超过 15 MB";
      continue;
    }
    if (queuedFiles.value.length < 10) queuedFiles.value.push(file);
  }
  input.value = "";
}

async function imageSize(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

async function uploadQueued(trade: TradeView) {
  for (const file of queuedFiles.value) {
    const size = await imageSize(file);
    await upload(`trades/${trade.id}/${file.name}`, file, {
      access: "private",
      handleUploadUrl: `/api/trading/trades/${trade.id}/attachments`,
      clientPayload: JSON.stringify({
        tradeId: trade.id,
        fileName: file.name,
        size: file.size,
        ...size,
      }),
    });
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
      ? await $fetch<TradeView>(`/api/trading/trades/${props.trade.id}`, { method: "PATCH", body: payload })
      : await $fetch<TradeView>("/api/trading/trades", { method: "POST", body: payload });
    await uploadQueued(trade);
    emit("saved", trade);
    emit("close");
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="review-overlay">
      <div v-if="open" class="trade-modal-backdrop" @click.self="emit('close')">
        <section class="trade-form-modal" role="dialog" aria-modal="true" aria-labelledby="trade-form-title">
          <header class="trade-modal-header">
            <div>
              <span class="eyebrow">{{ trade ? "EDIT TRADE" : cloneSource ? "CLONE TRADE" : "NEW TRADE" }}</span>
              <h2 id="trade-form-title">{{ trade ? "编辑交易记录" : "记录一笔交易" }}</h2>
            </div>
            <button type="button" class="trade-modal-close" aria-label="关闭" @click="emit('close')">×</button>
          </header>

          <form class="trade-form-body" @submit.prevent="save">
            <div class="trade-form-main">
              <section class="trade-form-section">
                <div class="trade-section-title"><span>01</span><h3>基本信息</h3></div>
                <div class="trade-form-grid">
                  <label>交易状态<select v-model="form.status"><option value="closed">已平仓</option><option value="open">未平仓</option></select></label>
                  <label>交易日期<input v-model="form.tradeDate" type="date" required></label>
                  <label>市场<select v-model="form.market"><option value="crypto">加密</option><option value="a_share">A股</option></select></label>
                  <label>方向<select v-model="form.side"><option value="long">做多</option><option value="short">做空</option></select></label>
                  <label>合约/证券代码<input v-model="form.instrumentCode" placeholder="MUUSDT / 159316"></label>
                  <label>标的<input v-model="form.symbol" required placeholder="标的名称"></label>
                  <label>策略<input v-model="form.strategy" list="trade-strategies" required><datalist id="trade-strategies"><option v-for="item in strategies" :key="item.id" :value="item.label" /></datalist></label>
                  <label>周期<input v-model="form.timeframe" list="trade-timeframes" required><datalist id="trade-timeframes"><option v-for="item in timeframes" :key="item.id" :value="item.label" /></datalist></label>
                </div>
              </section>

              <section class="trade-form-section">
                <div class="trade-section-title"><span>02</span><h3>开平仓与资金</h3></div>
                <div class="trade-form-grid">
                  <label>开仓时间<input v-model="entryLocal" type="datetime-local" required></label>
                  <label>开仓价<input v-model="form.entryPrice" inputmode="decimal" required placeholder="0.0000"></label>
                  <label v-if="form.status === 'closed'">平仓时间<input v-model="exitLocal" type="datetime-local" required></label>
                  <label v-if="form.status === 'closed'">平仓价<input v-model="form.exitPrice" inputmode="decimal" required placeholder="0.0000"></label>
                  <label>仓位口径<select v-model="form.positionBasis"><option value="notional">名义金额</option><option value="quantity">数量</option></select></label>
                  <label>仓位/名义金额<input v-model="form.positionSize" inputmode="decimal" required placeholder="0"></label>
                  <label>结算币种<select v-model="form.settlementCurrency"><option value="USDT">USDT</option><option value="CNY">CNY</option><option value="USD">USD</option></select></label>
                  <label>逐笔人民币汇率<input v-model="form.fxToCny" inputmode="decimal" :disabled="form.settlementCurrency === 'CNY'" required></label>
                  <label>计划风险金额<input v-model="form.plannedRiskAmount" inputmode="decimal" placeholder="可选"></label>
                  <label>手续费税费<input v-model="form.fees" inputmode="decimal" required></label>
                </div>
                <label class="trade-full-field">入场理由<textarea v-model="form.entryReason" rows="3" required placeholder="为什么在这里入场？" /></label>
                <label v-if="form.status === 'closed'" class="trade-full-field">出场理由<textarea v-model="form.exitReason" rows="3" required placeholder="为什么在这里离场？" /></label>
              </section>

              <section class="trade-form-section">
                <div class="trade-section-title"><span>03</span><h3>执行复盘</h3></div>
                <div class="trade-form-grid">
                  <label>执行评分<select v-model="form.executionGrade"><option :value="null">未评分</option><option value="A">A · 完全按计划</option><option value="B">B · 有瑕疵</option><option value="C">C · 明显失控</option></select></label>
                  <label>情绪状态<input v-model="form.emotion" list="trade-emotions" placeholder="平静 / 犹豫"><datalist id="trade-emotions"><option v-for="item in emotions" :key="item.id" :value="item.label" /></datalist></label>
                </div>
                <div class="trade-tag-field">
                  <span>错误标签</span>
                  <div><button v-for="item in errorTags" :key="item.id" type="button" :class="{ active: form.errorTags?.includes(item.label) }" @click="toggleErrorTag(item.label)">{{ item.label }}</button></div>
                </div>
                <label class="trade-full-field">错误复盘<textarea v-model="form.errorNotes" rows="4" placeholder="保留当时的原始判断、失误过程和触发条件" /></label>
                <div class="trade-form-grid trade-text-grid">
                  <label>做对了什么<textarea v-model="form.didWell" rows="4" /></label>
                  <label>下次改进<textarea v-model="form.nextImprovement" rows="4" /></label>
                </div>
              </section>

              <section class="trade-form-section">
                <div class="trade-section-title"><span>04</span><h3>行情截图</h3></div>
                <label class="trade-upload-zone">
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="chooseFiles">
                  <b>选择截图</b>
                  <span>最多 10 张，每张不超过 15 MB；支持 JPEG、PNG、WebP</span>
                </label>
                <div v-if="queuedFiles.length" class="queued-files">
                  <span v-for="(file, index) in queuedFiles" :key="`${file.name}-${index}`">{{ file.name }}<button type="button" @click="queuedFiles.splice(index, 1)">×</button></span>
                </div>
              </section>
            </div>

            <aside class="trade-preview-panel">
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
            <p v-if="error" class="form-error">{{ error }}</p>
            <div>
              <button type="button" class="trading-secondary-button" @click="emit('close')">取消</button>
              <button type="button" class="trading-primary-button" :disabled="saving" @click="save">{{ saving ? "正在保存…" : "保存交易" }}</button>
            </div>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
