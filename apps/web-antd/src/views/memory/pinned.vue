<script lang="ts" setup>
import type { Memo } from '#/shared/types/memory';

import { onBeforeUnmount, onMounted, ref } from 'vue';

import { Button, Empty, Image, Result, Skeleton, Tag } from 'ant-design-vue';

import { apiUrl, isCanceledRequest, listMemos } from '#/api';
import MarkdownDocument from '#/components/markdown-document.vue';
import PageFrame from '#/components/page-frame.vue';
import { errorMessage, formatTradingDateTime } from '#/lib/trading';

const items = ref<Memo[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref('');
let controller: AbortController | undefined;

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function load() {
  controller?.abort();
  const nextController = new AbortController();
  controller = nextController;
  loading.value = true;
  error.value = '';
  try {
    const loaded: Memo[] = [];
    let targetPage = 1;
    let result;
    do {
      result = await listMemos(
        { page: targetPage, pageSize: 50, pinned: true },
        nextController.signal,
      );
      if (nextController.signal.aborted) return;
      loaded.push(...result.items);
      targetPage = result.page + 1;
    } while (result.hasMore);
    items.value = loaded;
    total.value = result.total;
  } catch (error_) {
    if (!isCanceledRequest(error_)) error.value = errorMessage(error_);
  } finally {
    if (controller === nextController) {
      controller = undefined;
      loading.value = false;
    }
  }
}

onMounted(() => void load());
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <PageFrame
    kicker="PINNED MEMOS"
    title="固定 Memo 总览"
    subtitle="集中查看已固定的 Memo，完整保留 Markdown 内容。"
  >
    <Skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
    <Result v-else-if="error" status="error" title="读取固定 Memo 失败" :sub-title="error">
      <template #extra><Button @click="load">重试</Button></template>
    </Result>
    <section v-else class="market-panel memo-pinned-overview">
      <div class="memo-pinned-heading">
        <div>
          <div class="page-kicker">PINNED ARCHIVE</div>
          <h2>已固定内容</h2>
        </div>
        <span>{{ total }} 条记录</span>
      </div>

      <Empty v-if="items.length === 0" description="暂无固定 Memo" />
      <article v-for="item in items" :key="item.id" class="memo-pinned-card">
        <header class="memo-pinned-card-header">
          <div class="memo-list-meta">
            <Tag color="blue"> <span class="memo-pin-mark">●</span> 已固定</Tag>
            <span>{{ formatTradingDateTime(item.createdAt) }}</span>
          </div>
          <span class="memo-pinned-version">v{{ item.version }}</span>
        </header>

        <MarkdownDocument v-if="item.text" :markdown="item.text" />
        <p v-else class="muted">这条 Memo 只有附件。</p>

        <section v-if="item.attachments.length > 0" class="memo-detail-attachments memo-pinned-attachments">
          <h3>附件</h3>
          <div v-for="attachment in item.attachments" :key="attachment.id" class="memo-attachment-card">
            <Image
              v-if="attachment.contentType.startsWith('image/')"
              :src="apiUrl(attachment.accessUrl)"
              :alt="attachment.fileName"
              :width="72"
              :height="72"
              preview
            />
            <div>
              <strong>{{ attachment.fileName }}</strong>
              <small>{{ formatBytes(attachment.size) }} · {{ formatTradingDateTime(attachment.createdAt) }}</small>
            </div>
            <Button type="link" :href="apiUrl(attachment.accessUrl)" target="_blank">打开</Button>
          </div>
        </section>
      </article>
    </section>
  </PageFrame>
</template>
