<script lang="ts" setup>
import type { TradeView } from '#/shared/types/trading';

import { ref, watch } from 'vue';

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  EditOutlined,
  StarOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Empty,
  Image,
  message,
  Popconfirm,
  Space,
  Tag,
} from 'ant-design-vue';

import {
  apiUrl,
  deleteAttachment,
  deleteTrade,
  getTrade,
  updateAttachment,
} from '#/api';
import {
  errorMessage,
  formatMoney,
  formatNumber,
  formatTradingDate,
  formatTradingDateTime,
  marketLabel,
  sideLabel,
  statusLabel,
} from '#/lib/trading';

const props = defineProps<{ trade: null | TradeView }>();
const emit = defineEmits<{
  close: [];
  deleted: [id: string];
  edit: [trade: TradeView];
  refresh: [];
  updated: [trade: TradeView];
}>();

const deleting = ref(false);
const attachmentAction = ref('');
const error = ref('');

watch(
  () => props.trade?.id,
  () => (error.value = ''),
);

async function refreshTrade(id: string) {
  const latest = await getTrade(id);
  emit('updated', latest);
  emit('refresh');
}

async function runAttachmentAction(
  action: string,
  update: () => Promise<unknown>,
) {
  if (!props.trade || attachmentAction.value) return;
  attachmentAction.value = action;
  error.value = '';
  try {
    await update();
    await refreshTrade(props.trade.id);
  } catch (error_) {
    error.value = `${errorMessage(error_)}，请重试`;
  } finally {
    attachmentAction.value = '';
  }
}

function setCover(id: string) {
  const trade = props.trade;
  if (!trade) return;
  return runAttachmentAction('cover', () =>
    updateAttachment(trade.id, id, { isCover: true }),
  );
}

function removeAttachment(id: string) {
  const trade = props.trade;
  if (!trade) return;
  return runAttachmentAction('remove', () =>
    deleteAttachment(trade.id, id),
  );
}

function moveAttachment(index: number, direction: -1 | 1) {
  const trade = props.trade;
  if (!trade) return;
  const current = trade.attachments[index];
  const target = trade.attachments[index + direction];
  if (!current || !target) return;
  return runAttachmentAction('move', () =>
    Promise.all([
      updateAttachment(trade.id, current.id, { sortOrder: target.sortOrder }),
      updateAttachment(trade.id, target.id, { sortOrder: current.sortOrder }),
    ]),
  );
}

async function removeTrade() {
  const trade = props.trade;
  if (!trade || deleting.value) return;
  deleting.value = true;
  error.value = '';
  try {
    await deleteTrade(trade.id, trade.version);
    message.success('交易已移入回收状态');
    emit('deleted', trade.id);
    emit('close');
  } catch (error_) {
    error.value = errorMessage(error_);
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <Drawer
    :open="Boolean(trade)"
    width="min(52rem, 96vw)"
    placement="right"
    :destroy-on-close="true"
    @close="emit('close')"
  >
    <template v-if="trade" #title>
      <div class="detail-title">
        <span>{{ marketLabel(trade.market) }} · {{ formatTradingDate(trade.tradeDate) }}</span>
        <strong>{{ trade.symbol }} <small>{{ trade.instrumentCode }}</small></strong>
      </div>
    </template>

    <template v-if="trade" #extra>
      <Button type="primary" @click="emit('edit', trade)">
        <EditOutlined />编辑
      </Button>
    </template>

    <div v-if="trade" class="trade-detail">
      <Space wrap>
        <Tag :color="trade.status === 'closed' ? 'green' : 'gold'">{{ statusLabel(trade.status) }}</Tag>
        <Tag>{{ sideLabel(trade.side) }}</Tag>
        <Tag>{{ trade.strategy }}</Tag>
        <Tag>{{ trade.timeframe }}</Tag>
      </Space>

      <section class="trade-result-hero">
        <div>
          <span>人民币净盈亏</span>
          <strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong>
        </div>
        <dl>
          <div><dt>结算净盈亏</dt><dd>{{ formatNumber(trade.netPnl, 4) }} {{ trade.settlementCurrency }}</dd></div>
          <div><dt>盈亏 R 倍</dt><dd>{{ trade.rMultiple ? `${formatNumber(trade.rMultiple)}R` : '—' }}</dd></div>
          <div><dt>持仓</dt><dd>{{ trade.holdMinutes === null ? '—' : `${trade.holdMinutes} 分钟` }}</dd></div>
          <div><dt>执行评分</dt><dd>{{ trade.executionGrade ?? '—' }}</dd></div>
        </dl>
      </section>

      <div class="trade-detail-grid">
        <section class="market-panel">
          <div class="page-kicker">ENTRY</div><h3>入场</h3>
          <p>{{ trade.entryReason }}</p>
          <Descriptions :column="1" size="small">
            <DescriptionsItem label="时间">{{ formatTradingDateTime(trade.entryAt) }}</DescriptionsItem>
            <DescriptionsItem label="价格">{{ formatNumber(trade.entryPrice, 8) }}</DescriptionsItem>
            <DescriptionsItem label="仓位">{{ formatNumber(trade.positionSize, 4) }} · {{ trade.positionBasis === 'quantity' ? '数量' : '名义金额' }}</DescriptionsItem>
          </Descriptions>
        </section>
        <section class="market-panel">
          <div class="page-kicker">EXIT</div><h3>出场</h3>
          <p>{{ trade.exitReason ?? '这笔交易尚未平仓。' }}</p>
          <Descriptions :column="1" size="small">
            <DescriptionsItem label="时间">{{ formatTradingDateTime(trade.exitAt) }}</DescriptionsItem>
            <DescriptionsItem label="价格">{{ formatNumber(trade.exitPrice, 8) }}</DescriptionsItem>
            <DescriptionsItem label="手续费">{{ formatNumber(trade.fees, 4) }} {{ trade.settlementCurrency }}</DescriptionsItem>
          </Descriptions>
        </section>
      </div>

      <section class="market-panel review-notes">
        <div><span>情绪状态</span><p>{{ trade.emotion ?? '未记录' }}</p></div>
        <div><span>错误标签</span><p>{{ trade.errorTags?.join('、') || '无' }}</p></div>
        <div><span>错误复盘</span><p>{{ trade.errorNotes || '未记录' }}</p></div>
        <div><span>做对了什么</span><p>{{ trade.didWell || '未记录' }}</p></div>
        <div><span>下次改进</span><p>{{ trade.nextImprovement || '未记录' }}</p></div>
      </section>

      <section class="market-panel">
        <header class="panel-heading">
          <div><div class="page-kicker">SCREENSHOTS</div><h3>行情截图</h3></div>
          <span>{{ trade.attachments.length }} / 10</span>
        </header>
        <Image.PreviewGroup v-if="trade.attachments.length > 0">
          <div class="trade-gallery">
            <figure v-for="(item, index) in trade.attachments" :key="item.id">
              <Image :src="apiUrl(item.fileUrl)" :alt="item.fileName" />
              <figcaption>
                <span>{{ item.isCover ? '封面' : item.fileName }}</span>
                <Space size="small">
                  <Button v-if="index > 0" size="small" aria-label="前移截图" :disabled="Boolean(attachmentAction)" @click="moveAttachment(index, -1)"><ArrowLeftOutlined /></Button>
                  <Button v-if="index < trade.attachments.length - 1" size="small" aria-label="后移截图" :disabled="Boolean(attachmentAction)" @click="moveAttachment(index, 1)"><ArrowRightOutlined /></Button>
                  <Button v-if="!item.isCover" size="small" :disabled="Boolean(attachmentAction)" @click="setCover(item.id)"><StarOutlined />封面</Button>
                  <Popconfirm title="确定删除这张截图吗？" @confirm="removeAttachment(item.id)">
                    <Button size="small" danger :disabled="Boolean(attachmentAction)"><DeleteOutlined /></Button>
                  </Popconfirm>
                </Space>
              </figcaption>
            </figure>
          </div>
        </Image.PreviewGroup>
        <Empty v-else description="这笔交易还没有截图" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </section>

      <Alert v-if="error" type="error" show-icon :message="error" />
      <div class="danger-zone">
        <Popconfirm title="确定将这笔交易移入回收状态吗？" @confirm="removeTrade">
          <Button danger :loading="deleting"><DeleteOutlined />移入回收状态</Button>
        </Popconfirm>
      </div>
    </div>
  </Drawer>
</template>
