<script lang="ts" setup>
import type {
  ExecutionGrade,
  TradeInput,
  TradeView,
  TradingOption,
  TradingOptionsResponse,
} from '#/shared/types/trading';

type TradeFormModel = Omit<
  TradeInput,
  | 'didWell'
  | 'emotion'
  | 'errorNotes'
  | 'executionGrade'
  | 'exitPrice'
  | 'exitReason'
  | 'fees'
  | 'instrumentCode'
  | 'nextImprovement'
  | 'plannedRiskAmount'
> & {
  didWell: string;
  emotion: string;
  errorNotes: string;
  executionGrade: ExecutionGrade | undefined;
  exitPrice: string;
  exitReason: string;
  fees: string;
  instrumentCode: string;
  nextImprovement: string;
  plannedRiskAmount: string;
};

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

import { UploadOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Textarea,
  Upload,
} from 'ant-design-vue';

import {
  createTrade,
  getTrade,
  getTradingOptions,
  updateTrade,
  uploadTradeAttachments,
} from '#/api';
import {
  blankTrade,
  errorMessage,
  formatMoney,
  formatNumber,
  isoDateTime,
  localDateTime,
} from '#/lib/trading';
import { calculateTrade } from '#/shared/trading-calculator';

const props = defineProps<{
  cloneSource?: null | TradeView;
  open: boolean;
  trade?: null | TradeView;
}>();
const emit = defineEmits<{
  close: [];
  saved: [trade: TradeView];
}>();

const saving = ref(false);
const loadingOptions = ref(false);
const error = ref('');
const queuedFiles = ref<File[]>([]);
const options = ref<null | TradingOptionsResponse>(null);
const form = reactive<TradeFormModel>({
  ...blankTrade(),
  didWell: '',
  emotion: '',
  errorNotes: '',
  executionGrade: undefined,
  exitPrice: '',
  exitReason: '',
  fees: '0',
  instrumentCode: '',
  nextImprovement: '',
  plannedRiskAmount: '',
});
const entryLocal = ref('');
const exitLocal = ref('');
const initialSnapshot = ref('');

function snapshot() {
  return JSON.stringify({
    entryLocal: entryLocal.value,
    exitLocal: exitLocal.value,
    files: queuedFiles.value.map((file) => `${file.name}:${file.size}`),
    form,
  });
}

const dirty = computed(
  () => props.open && Boolean(initialSnapshot.value) && snapshot() !== initialSnapshot.value,
);

function activeOptions(kind: TradingOption['kind']) {
  return computed(() =>
    (options.value?.options ?? [])
      .filter((item) => item.kind === kind && item.active)
      .map((item) => ({ label: item.label, value: item.label })),
  );
}

const strategies = activeOptions('strategy');
const timeframes = activeOptions('timeframe');
const emotions = activeOptions('emotion');
const errorTags = activeOptions('error_tag');
const instrumentCodes = activeOptions('instrument_code');
const symbols = activeOptions('symbol');

const preview = computed(() => {
  try {
    return calculateTrade({
      ...form,
      entryAt: isoDateTime(entryLocal.value) ?? form.entryAt,
      exitAt: form.status === 'closed' ? isoDateTime(exitLocal.value) : null,
    });
  } catch {
    return null;
  }
});

function resetForm() {
  const rate = options.value?.settings.defaultUsdtCnyRate ?? '7.2';
  let source: TradeInput = blankTrade(rate);
  if (props.cloneSource) {
    source = {
      ...source,
      fxToCny: props.cloneSource.fxToCny,
      instrumentCode: props.cloneSource.instrumentCode,
      market: props.cloneSource.market,
      positionBasis: props.cloneSource.positionBasis,
      settlementCurrency: props.cloneSource.settlementCurrency,
      side: props.cloneSource.side,
      strategy: props.cloneSource.strategy,
      symbol: props.cloneSource.symbol,
      timeframe: props.cloneSource.timeframe,
    };
  }
  if (props.trade) {
    const { attachments: _attachments, ...tradeInput } = props.trade;
    source = {
      ...tradeInput,
      errorTags: [...(props.trade.errorTags ?? [])],
      version: props.trade.version,
    };
  }
  Object.assign(form, {
    ...source,
    didWell: source.didWell ?? '',
    emotion: source.emotion ?? '',
    errorNotes: source.errorNotes ?? '',
    executionGrade: source.executionGrade ?? undefined,
    exitPrice: source.exitPrice ?? '',
    exitReason: source.exitReason ?? '',
    fees: source.fees ?? '0',
    instrumentCode: source.instrumentCode ?? '',
    nextImprovement: source.nextImprovement ?? '',
    plannedRiskAmount: source.plannedRiskAmount ?? '',
  });
  if (!props.trade) form.version = undefined;
  entryLocal.value = localDateTime(source.entryAt);
  exitLocal.value = localDateTime(source.exitAt);
  queuedFiles.value = [];
  error.value = '';
  initialSnapshot.value = snapshot();
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    if (!options.value) {
      loadingOptions.value = true;
      try {
        options.value = await getTradingOptions();
      } catch (error_) {
        error.value = errorMessage(error_);
      } finally {
        loadingOptions.value = false;
      }
    }
    resetForm();
  },
  { immediate: true },
);

watch(
  () => form.market,
  (market) => {
    if (props.trade) return;
    if (market === 'a_share') {
      form.positionBasis = 'quantity';
      form.settlementCurrency = 'CNY';
      form.fxToCny = '1';
    } else {
      form.positionBasis = 'notional';
      form.settlementCurrency = 'USDT';
      form.fxToCny = options.value?.settings.defaultUsdtCnyRate ?? '7.2';
    }
  },
);

watch(
  () => form.settlementCurrency,
  (currency) => {
    if (currency === 'CNY') form.fxToCny = '1';
  },
);

function requestClose() {
  if (dirty.value && !window.confirm('这笔交易还有未保存的修改，确定关闭吗？')) return;
  emit('close');
}

function toggleErrorTag(label: string) {
  const tags = form.errorTags ?? [];
  form.errorTags = tags.includes(label)
    ? tags.filter((item) => item !== label)
    : [...tags, label];
}

function queueFile(file: File) {
  error.value = '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    error.value = '只支持 JPEG、PNG 和 WebP 截图。';
    return false;
  }
  if (file.size > 15 * 1024 * 1024) {
    error.value = '单张截图不能超过 15 MB。';
    return false;
  }
  if (queuedFiles.value.length >= 10) {
    error.value = '每笔交易最多上传 10 张截图。';
    return false;
  }
  queuedFiles.value.push(file);
  return false;
}

async function save() {
  if (saving.value) return;
  error.value = '';
  if (!form.symbol.trim() || !form.strategy.trim() || !form.entryReason.trim()) {
    error.value = '标的、策略和入场理由不能为空。';
    return;
  }
  if (form.status === 'closed' && (!form.exitPrice || !form.exitReason?.trim())) {
    error.value = '已平仓交易必须填写平仓价格和出场理由。';
    return;
  }

  saving.value = true;
  try {
    const payload: TradeInput = {
      ...form,
      entryAt: isoDateTime(entryLocal.value) ?? '',
      executionGrade: form.executionGrade ?? null,
      exitAt: form.status === 'closed' ? isoDateTime(exitLocal.value) : null,
      exitPrice: form.status === 'closed' ? form.exitPrice : null,
      exitReason: form.status === 'closed' ? form.exitReason : null,
      instrumentCode: form.instrumentCode || null,
    };
    let trade = props.trade
      ? await updateTrade(props.trade.id, payload)
      : await createTrade(payload);
    form.version = trade.version;

    if (queuedFiles.value.length > 0) {
      try {
        await uploadTradeAttachments(trade.id, queuedFiles.value);
        trade = await getTrade(trade.id);
        queuedFiles.value = [];
      } catch (error_) {
        emit('saved', trade);
        error.value = `交易已保存，但截图上传失败：${errorMessage(error_)}`;
        return;
      }
    }

    initialSnapshot.value = snapshot();
    emit('saved', trade);
    emit('close');
  } catch (error_) {
    error.value = errorMessage(error_);
  } finally {
    saving.value = false;
  }
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = '';
}

onMounted(() => window.addEventListener('beforeunload', warnBeforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload));
onBeforeRouteLeave(
  () => !dirty.value || window.confirm('这笔交易还有未保存的修改，确定离开吗？'),
);
</script>

<template>
  <Modal
    :open="open"
    :title="trade ? '编辑交易记录' : cloneSource ? '复制交易记录' : '记录一笔交易'"
    width="min(72rem, 96vw)"
    :confirm-loading="saving"
    ok-text="保存交易"
    cancel-text="取消"
    :mask-closable="false"
    @cancel="requestClose"
    @ok="save"
  >
    <Spin :spinning="loadingOptions">
      <Form :model="form" layout="vertical" class="trade-form">
        <div class="trade-form-grid">
          <FormItem label="交易状态" required>
            <Select v-model:value="form.status" :options="[{ label: '已平仓', value: 'closed' }, { label: '未平仓', value: 'open' }]" />
          </FormItem>
          <FormItem label="交易日期" required>
            <DatePicker v-model:value="form.tradeDate" value-format="YYYY-MM-DD" />
          </FormItem>
          <FormItem label="市场" required>
            <Select v-model:value="form.market" :options="[{ label: '加密', value: 'crypto' }, { label: 'A 股', value: 'a_share' }]" />
          </FormItem>
          <FormItem label="方向" required>
            <Select v-model:value="form.side" :options="[{ label: '做多', value: 'long' }, { label: '做空', value: 'short' }]" />
          </FormItem>
          <FormItem label="合约 / 证券代码">
            <AutoComplete v-model:value="form.instrumentCode" :options="instrumentCodes" placeholder="MUUSDT / 159316" />
          </FormItem>
          <FormItem label="标的" required>
            <AutoComplete v-model:value="form.symbol" :options="symbols" placeholder="黄金" />
          </FormItem>
          <FormItem label="策略" required>
            <AutoComplete v-model:value="form.strategy" :options="strategies" />
          </FormItem>
          <FormItem label="周期" required>
            <AutoComplete v-model:value="form.timeframe" :options="timeframes" />
          </FormItem>
        </div>

        <div class="form-section-title"><span>01</span> 开平仓与资金</div>
        <div class="trade-form-grid">
          <FormItem label="开仓时间" required>
            <DatePicker v-model:value="entryLocal" value-format="YYYY-MM-DDTHH:mm" show-time />
          </FormItem>
          <FormItem label="开仓价" required><Input v-model:value="form.entryPrice" inputmode="decimal" /></FormItem>
          <FormItem v-if="form.status === 'closed'" label="平仓时间" required>
            <DatePicker v-model:value="exitLocal" value-format="YYYY-MM-DDTHH:mm" show-time />
          </FormItem>
          <FormItem v-if="form.status === 'closed'" label="平仓价" required><Input v-model:value="form.exitPrice" inputmode="decimal" /></FormItem>
          <FormItem label="仓位口径"><Select v-model:value="form.positionBasis" :options="[{ label: '名义金额', value: 'notional' }, { label: '数量', value: 'quantity' }]" /></FormItem>
          <FormItem label="仓位 / 名义金额" required><Input v-model:value="form.positionSize" inputmode="decimal" /></FormItem>
          <FormItem label="结算币种"><Select v-model:value="form.settlementCurrency" :options="['USDT', 'CNY', 'USD'].map((value) => ({ label: value, value }))" /></FormItem>
          <FormItem label="人民币汇率"><Input v-model:value="form.fxToCny" :disabled="form.settlementCurrency === 'CNY'" inputmode="decimal" /></FormItem>
          <FormItem label="计划风险金额"><Input v-model:value="form.plannedRiskAmount" inputmode="decimal" /></FormItem>
          <FormItem label="手续费税费"><Input v-model:value="form.fees" inputmode="decimal" /></FormItem>
        </div>
        <FormItem label="入场理由" required><Textarea v-model:value="form.entryReason" :rows="3" /></FormItem>
        <FormItem v-if="form.status === 'closed'" label="出场理由" required><Textarea v-model:value="form.exitReason" :rows="3" /></FormItem>

        <div class="form-section-title"><span>02</span> 执行复盘</div>
        <div class="trade-form-grid">
          <FormItem label="执行评分"><Select v-model:value="form.executionGrade" allow-clear :options="['A', 'B', 'C'].map((value) => ({ label: value, value }))" /></FormItem>
          <FormItem label="情绪状态"><AutoComplete v-model:value="form.emotion" :options="emotions" /></FormItem>
        </div>
        <FormItem label="错误标签">
          <Space wrap>
            <Tag
              v-for="item in errorTags"
              :key="item.value"
              class="selectable-tag"
              :color="form.errorTags?.includes(item.value) ? 'red' : 'default'"
              @click="toggleErrorTag(item.value)"
            >
{{ item.label }}
</Tag>
          </Space>
        </FormItem>
        <FormItem label="错误复盘"><Textarea v-model:value="form.errorNotes" :rows="3" /></FormItem>
        <div class="trade-form-grid two-column">
          <FormItem label="做对了什么"><Textarea v-model:value="form.didWell" :rows="3" /></FormItem>
          <FormItem label="下次改进"><Textarea v-model:value="form.nextImprovement" :rows="3" /></FormItem>
        </div>

        <div class="form-section-title"><span>03</span> 行情截图</div>
        <Upload :before-upload="queueFile" :show-upload-list="false" accept="image/jpeg,image/png,image/webp" multiple>
          <Button><UploadOutlined />选择截图</Button>
        </Upload>
        <p class="muted upload-note">最多 10 张，每张不超过 15 MB；支持 JPEG、PNG、WebP。</p>
        <Space v-if="queuedFiles.length > 0" wrap>
          <Tag v-for="(file, index) in queuedFiles" :key="`${file.name}-${index}`" closable @close="queuedFiles.splice(index, 1)">
            {{ file.name }}
          </Tag>
        </Space>

        <Card class="trade-preview" :bordered="false">
          <div class="page-kicker">LIVE PREVIEW</div>
          <div class="preview-grid">
            <div><span>毛盈亏</span><strong>{{ preview?.grossPnl ? formatNumber(preview.grossPnl, 4) : '—' }}</strong></div>
            <div><span>净盈亏</span><strong :class="{ positive: preview?.isWinning, negative: preview?.isWinning === false }">{{ preview?.netPnl ? formatNumber(preview.netPnl, 4) : '—' }}</strong></div>
            <div><span>人民币盈亏</span><strong>{{ formatMoney(preview?.pnlCny) }}</strong></div>
            <div><span>R 倍数</span><strong>{{ preview?.rMultiple ? `${formatNumber(preview.rMultiple)}R` : '—' }}</strong></div>
            <div><span>持仓时长</span><strong>{{ preview?.holdMinutes == null ? '—' : `${preview.holdMinutes} 分钟` }}</strong></div>
          </div>
        </Card>
        <Alert v-if="error" :message="error" type="error" show-icon />
      </Form>
    </Spin>
  </Modal>
</template>
