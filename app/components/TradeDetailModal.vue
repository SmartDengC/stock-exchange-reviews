<script setup lang="ts">
import type { TradeView } from "~~/shared/types/trading";
import { useAccessibleDialog } from "~/composables/use-accessible-dialog";
import {
  errorMessage,
  formatMoney,
  formatNumber,
  formatTradingDate,
  formatTradingDateTime,
  marketLabel,
  sideLabel,
  statusLabel,
} from "~/lib/trading";

const props = defineProps<{ trade: TradeView | null }>();
const emit = defineEmits<{
  close: [];
  edit: [trade: TradeView];
  deleted: [id: string];
  refresh: [];
  updated: [trade: TradeView];
}>();

const imageIndex = ref<number | null>(null);
const deleting = ref(false);
const attachmentAction = ref("");
const error = ref("");
const closeButton = ref<HTMLElement | null>(null);
const lightboxCloseButton = ref<HTMLElement | null>(null);
const visible = computed(() => Boolean(props.trade));
const lightboxVisible = computed(() => visible.value && imageIndex.value !== null);
const { $api } = useNuxtApp();
const apiUrl = useApiUrl();

function closeDetail() {
  emit("close");
}

function closeLightbox() {
  imageIndex.value = null;
}

const { dialogRef: detailDialogRef, onDialogKeydown: onDetailDialogKeydown } = useAccessibleDialog(visible, closeDetail, closeButton);
const { dialogRef: lightboxDialogRef, onDialogKeydown: onLightboxDialogKeydown } = useAccessibleDialog(lightboxVisible, closeLightbox, lightboxCloseButton);

watch(() => props.trade?.id, () => {
  imageIndex.value = null;
  error.value = "";
});

async function removeTrade() {
  const trade = props.trade;
  if (!trade || deleting.value || !window.confirm("确定将这笔交易移入回收状态吗？")) return;
  deleting.value = true;
  error.value = "";
  try {
    await $api(`/api/trading/trades/${trade.id}`, {
      method: "DELETE",
      query: { version: trade.version },
    });
    emit("deleted", trade.id);
    emit("close");
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    deleting.value = false;
  }
}

async function setCover(id: string) {
  const trade = props.trade;
  if (!trade || attachmentAction.value) return;
  await updateAttachment("cover", trade.id, async () => {
    await $api(`/api/trading/trades/${trade.id}/attachments/${id}`, {
      method: "PATCH",
      body: { isCover: true },
    });
  });
}

async function removeAttachment(id: string) {
  const trade = props.trade;
  if (!trade || attachmentAction.value || !window.confirm("确定删除这张截图吗？")) return;
  await updateAttachment("remove", trade.id, async () => {
    await $api(`/api/trading/trades/${trade.id}/attachments/${id}`, { method: "DELETE" });
  });
}

async function moveAttachment(index: number, direction: -1 | 1) {
  const trade = props.trade;
  if (!trade || attachmentAction.value) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= trade.attachments.length) return;
  const current = trade.attachments[index];
  const target = trade.attachments[targetIndex];
  if (!current || !target) return;
  await updateAttachment("move", trade.id, async () => {
    await Promise.all([
      $api(`/api/trading/trades/${trade.id}/attachments/${current.id}`, {
        method: "PATCH",
        body: { sortOrder: target.sortOrder },
      }),
      $api(`/api/trading/trades/${trade.id}/attachments/${target.id}`, {
        method: "PATCH",
        body: { sortOrder: current.sortOrder },
      }),
    ]);
  });
}

async function updateAttachment(action: string, tradeId: string, update: () => Promise<void>) {
  attachmentAction.value = action;
  error.value = "";
  try {
    await update();
    await refreshTrade(tradeId);
  } catch (cause) {
    error.value = `${errorMessage(cause)}，请重试`;
  } finally {
    attachmentAction.value = "";
  }
}

async function refreshTrade(id: string) {
  const latest = await $api<TradeView>(`/api/trading/trades/${id}`);
  emit("updated", latest);
  emit("refresh");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="review-overlay">
      <div v-if="trade" class="trade-modal-backdrop">
        <button type="button" class="trade-modal-dismiss" aria-label="关闭交易详情" @click="closeDetail" />
        <section
          ref="detailDialogRef"
          class="trade-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trade-detail-title"
          tabindex="-1"
          @keydown="onDetailDialogKeydown"
        >
          <header class="trade-modal-header">
            <div>
              <span class="eyebrow">{{ marketLabel(trade.market) }} / {{ formatTradingDate(trade.tradeDate) }}</span>
              <h2 id="trade-detail-title">{{ trade.symbol }} <small>{{ trade.instrumentCode }}</small></h2>
              <div class="trade-detail-tags">
                <span :class="`status-${trade.status}`">{{ statusLabel(trade.status) }}</span>
                <span>{{ sideLabel(trade.side) }}</span>
                <span>{{ trade.strategy }}</span>
                <span>{{ trade.timeframe }}</span>
              </div>
            </div>
            <button ref="closeButton" type="button" class="trade-modal-close" aria-label="关闭" @click="closeDetail">×</button>
          </header>

          <div class="trade-detail-body">
            <section class="trade-result-hero">
              <div>
                <span>人民币净盈亏</span>
                <strong :class="{ positive: trade.isWinning, negative: trade.isWinning === false }">{{ formatMoney(trade.pnlCny) }}</strong>
              </div>
              <dl>
                <div><dt>结算净盈亏</dt><dd>{{ formatNumber(trade.netPnl, 4) }} {{ trade.settlementCurrency }}</dd></div>
                <div><dt>盈亏 R 倍</dt><dd>{{ trade.rMultiple ? `${formatNumber(trade.rMultiple)}R` : "—" }}</dd></div>
                <div><dt>持仓</dt><dd>{{ trade.holdMinutes === null ? "—" : `${trade.holdMinutes} 分钟` }}</dd></div>
                <div><dt>执行评分</dt><dd>{{ trade.executionGrade ?? "—" }}</dd></div>
              </dl>
            </section>

            <section class="trade-detail-grid">
              <article>
                <span class="eyebrow">ENTRY</span>
                <h3>入场</h3>
                <p>{{ trade.entryReason }}</p>
                <dl>
                  <div><dt>时间</dt><dd>{{ formatTradingDateTime(trade.entryAt) }}</dd></div>
                  <div><dt>价格</dt><dd>{{ formatNumber(trade.entryPrice, 8) }}</dd></div>
                  <div><dt>仓位</dt><dd>{{ formatNumber(trade.positionSize, 4) }} · {{ trade.positionBasis === "quantity" ? "数量" : "名义金额" }}</dd></div>
                </dl>
              </article>
              <article>
                <span class="eyebrow">EXIT</span>
                <h3>出场</h3>
                <p>{{ trade.exitReason ?? "这笔交易尚未平仓。" }}</p>
                <dl>
                  <div><dt>时间</dt><dd>{{ formatTradingDateTime(trade.exitAt) }}</dd></div>
                  <div><dt>价格</dt><dd>{{ formatNumber(trade.exitPrice, 8) }}</dd></div>
                  <div><dt>手续费</dt><dd>{{ formatNumber(trade.fees, 4) }} {{ trade.settlementCurrency }}</dd></div>
                </dl>
              </article>
            </section>

            <section class="trade-review-block">
              <div><span>情绪状态</span><b>{{ trade.emotion ?? "未记录" }}</b></div>
              <div><span>错误标签</span><p>{{ trade.errorTags?.join("、") || "无" }}</p></div>
              <div><span>错误复盘</span><p>{{ trade.errorNotes || "未记录" }}</p></div>
              <div><span>做对了什么</span><p>{{ trade.didWell || "未记录" }}</p></div>
              <div><span>下次改进</span><p>{{ trade.nextImprovement || "未记录" }}</p></div>
            </section>

            <section class="trade-gallery-section">
              <div class="trade-gallery-head">
                <div><span class="eyebrow">SCREENSHOTS</span><h3>行情截图</h3></div>
                <span>{{ trade.attachments.length }} / 10</span>
              </div>
              <div v-if="trade.attachments.length" class="trade-gallery">
                <figure v-for="(image, index) in trade.attachments" :key="image.id">
                  <button type="button" @click="imageIndex = index"><img :src="apiUrl(image.fileUrl)" :alt="image.fileName" :width="image.width ?? 1600" :height="image.height ?? 900" loading="lazy"></button>
                  <figcaption>
                    <span>{{ image.isCover ? "封面" : image.fileName }}</span>
                    <div>
                      <button v-if="index > 0" type="button" :disabled="Boolean(attachmentAction)" aria-label="前移截图" @click="moveAttachment(index, -1)">←</button>
                      <button v-if="index < trade.attachments.length - 1" type="button" :disabled="Boolean(attachmentAction)" aria-label="后移截图" @click="moveAttachment(index, 1)">→</button>
                      <button v-if="!image.isCover" type="button" :disabled="Boolean(attachmentAction)" @click="setCover(image.id)">{{ attachmentAction === "cover" ? "处理中…" : "设封面" }}</button>
                      <button type="button" :disabled="Boolean(attachmentAction)" @click="removeAttachment(image.id)">{{ attachmentAction === "remove" ? "正在删除…" : "删除" }}</button>
                    </div>
                  </figcaption>
                </figure>
              </div>
              <p v-else class="trading-empty">这笔交易还没有截图。</p>
            </section>
            <p v-if="error" class="form-error" role="alert" aria-live="polite">{{ error }}</p>
          </div>

          <footer class="trade-modal-footer">
            <button type="button" class="trading-danger-button" :disabled="deleting" @click="removeTrade">{{ deleting ? "正在处理…" : "移入回收状态" }}</button>
            <button type="button" class="trading-primary-button" @click="emit('edit', trade)">编辑交易</button>
          </footer>
        </section>
      </div>
    </Transition>

    <section
      v-if="trade && imageIndex !== null"
      ref="lightboxDialogRef"
      class="trade-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="查看行情截图原图"
      tabindex="-1"
      @keydown="onLightboxDialogKeydown"
    >
      <button type="button" class="trade-lightbox-dismiss" aria-hidden="true" tabindex="-1" @click="closeLightbox" />
      <button ref="lightboxCloseButton" type="button" class="trade-lightbox-close" aria-label="关闭原图" @click="closeLightbox">×</button>
      <img
        :src="apiUrl(trade.attachments[imageIndex]?.fileUrl)"
        :alt="trade.attachments[imageIndex]?.fileName"
        :width="trade.attachments[imageIndex]?.width ?? 1600"
        :height="trade.attachments[imageIndex]?.height ?? 900"
      >
    </section>
  </Teleport>
</template>
