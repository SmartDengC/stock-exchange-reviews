<script setup lang="ts">
import type { TradeView } from "~~/shared/types/trading";
import {
  errorMessage,
  formatMoney,
  formatNumber,
  marketLabel,
  sideLabel,
  statusLabel,
} from "~/lib/trading";

const props = defineProps<{ trade: TradeView | null }>();
const emit = defineEmits<{
  close: [];
  edit: [trade: TradeView];
  clone: [trade: TradeView];
  deleted: [id: string];
  refresh: [];
  updated: [trade: TradeView];
}>();

const imageIndex = ref<number | null>(null);
const deleting = ref(false);
const error = ref("");

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
    await $fetch(`/api/trading/trades/${trade.id}`, {
      method: "DELETE",
      query: { updatedAt: trade.updatedAt },
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
  if (!trade) return;
  await $fetch(`/api/trading/trades/${trade.id}/attachments/${id}`, {
    method: "PATCH",
    body: { isCover: true },
  });
  await refreshTrade(trade.id);
}

async function removeAttachment(id: string) {
  const trade = props.trade;
  if (!trade || !window.confirm("确定删除这张截图吗？")) return;
  await $fetch(`/api/trading/trades/${trade.id}/attachments/${id}`, { method: "DELETE" });
  await refreshTrade(trade.id);
}

async function moveAttachment(index: number, direction: -1 | 1) {
  const trade = props.trade;
  if (!trade) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= trade.attachments.length) return;
  const current = trade.attachments[index];
  const target = trade.attachments[targetIndex];
  if (!current || !target) return;
  await Promise.all([
    $fetch(`/api/trading/trades/${trade.id}/attachments/${current.id}`, {
      method: "PATCH",
      body: { sortOrder: target.sortOrder },
    }),
    $fetch(`/api/trading/trades/${trade.id}/attachments/${target.id}`, {
      method: "PATCH",
      body: { sortOrder: current.sortOrder },
    }),
  ]);
  await refreshTrade(trade.id);
}

async function refreshTrade(id: string) {
  const latest = await $fetch<TradeView>(`/api/trading/trades/${id}`);
  emit("updated", latest);
  emit("refresh");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="review-overlay">
      <div v-if="trade" class="trade-modal-backdrop" @click.self="emit('close')">
        <section class="trade-detail-modal" role="dialog" aria-modal="true">
          <header class="trade-modal-header">
            <div>
              <span class="eyebrow">{{ marketLabel(trade.market) }} / {{ trade.tradeDate }}</span>
              <h2>{{ trade.symbol }} <small>{{ trade.instrumentCode }}</small></h2>
              <div class="trade-detail-tags">
                <span :class="`status-${trade.status}`">{{ statusLabel(trade.status) }}</span>
                <span>{{ sideLabel(trade.side) }}</span>
                <span>{{ trade.strategy }}</span>
                <span>{{ trade.timeframe }}</span>
              </div>
            </div>
            <button type="button" class="trade-modal-close" aria-label="关闭" @click="emit('close')">×</button>
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
                  <div><dt>时间</dt><dd>{{ new Date(trade.entryAt).toLocaleString("zh-CN") }}</dd></div>
                  <div><dt>价格</dt><dd>{{ formatNumber(trade.entryPrice, 8) }}</dd></div>
                  <div><dt>仓位</dt><dd>{{ formatNumber(trade.positionSize, 4) }} · {{ trade.positionBasis === "quantity" ? "数量" : "名义金额" }}</dd></div>
                </dl>
              </article>
              <article>
                <span class="eyebrow">EXIT</span>
                <h3>出场</h3>
                <p>{{ trade.exitReason ?? "这笔交易尚未平仓。" }}</p>
                <dl>
                  <div><dt>时间</dt><dd>{{ trade.exitAt ? new Date(trade.exitAt).toLocaleString("zh-CN") : "—" }}</dd></div>
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
                  <button type="button" @click="imageIndex = index"><img :src="image.fileUrl" :alt="image.fileName"></button>
                  <figcaption>
                    <span>{{ image.isCover ? "封面" : image.fileName }}</span>
                    <div>
                      <button v-if="index > 0" type="button" aria-label="前移截图" @click="moveAttachment(index, -1)">←</button>
                      <button v-if="index < trade.attachments.length - 1" type="button" aria-label="后移截图" @click="moveAttachment(index, 1)">→</button>
                      <button v-if="!image.isCover" type="button" @click="setCover(image.id)">设封面</button>
                      <button type="button" @click="removeAttachment(image.id)">删除</button>
                    </div>
                  </figcaption>
                </figure>
              </div>
              <p v-else class="trading-empty">这笔交易还没有截图。</p>
            </section>
            <p v-if="error" class="form-error">{{ error }}</p>
          </div>

          <footer class="trade-modal-footer">
            <button type="button" class="trading-danger-button" :disabled="deleting" @click="removeTrade">移入回收状态</button>
            <div>
              <button type="button" class="trading-secondary-button" @click="emit('clone', trade)">复制为新交易</button>
              <button type="button" class="trading-primary-button" @click="emit('edit', trade)">编辑交易</button>
            </div>
          </footer>
        </section>
      </div>
    </Transition>

    <div v-if="trade && imageIndex !== null" class="trade-lightbox" @click="imageIndex = null">
      <button type="button" aria-label="关闭原图" @click="imageIndex = null">×</button>
      <img :src="trade.attachments[imageIndex]?.fileUrl" :alt="trade.attachments[imageIndex]?.fileName">
    </div>
  </Teleport>
</template>
