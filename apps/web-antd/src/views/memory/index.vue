<script lang="ts" setup>
import type { Memo } from '#/shared/types/memory';

import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { EditOutlined } from '@ant-design/icons-vue';
import {
  Button,
  DatePicker,
  Drawer,
  Empty,
  Image,
  Input,
  message,
  Modal,
  Pagination,
  Result,
  Skeleton,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  apiUrl,
  deleteMemo,
  getMemo,
  isCanceledRequest,
  listMemos,
  updateMemo,
  uploadMemoAttachments,
} from '#/api';
import MarkdownDocument from '#/components/markdown-document.vue';
import PageFrame from '#/components/page-frame.vue';
import { currentTradingDate, errorMessage, formatTradingDateTime } from '#/lib/trading';

const route = useRoute();
const router = useRouter();
const defaultTo = currentTradingDate();
const defaultFrom = shiftTradingDate(defaultTo, -30);
const query = ref(typeof route.query.q === 'string' ? route.query.q : '');
const appliedQuery = ref(query.value);
const from = ref(typeof route.query.from === 'string' ? route.query.from : defaultFrom);
const to = ref(typeof route.query.to === 'string' ? route.query.to : defaultTo);
const page = ref(Math.max(1, Number(route.query.page) || 1));
const pageSize = ref(20);
const items = ref<Memo[]>([]);
const total = ref(0);
const hasMore = ref(false);
const loading = ref(true);
const error = ref('');
const selectedMemoId = ref('');
const selectedMemo = ref<Memo | null>(null);
const detailDrawerOpen = ref(false);
const editOpen = ref(false);
const detailModel = reactive({ text: '' });
const detailInitialText = ref('');
const detailLoading = ref(false);
const detailSaving = ref(false);
const detailError = ref('');
const detailFiles = ref<File[]>([]);
let controller: AbortController | undefined;

const detailDirty = computed(
  () => detailModel.text !== detailInitialText.value || detailFiles.value.length > 0
);

function shiftTradingDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return currentTradingDate(date);
}

async function load(targetPage = page.value) {
  controller?.abort();
  const nextController = new AbortController();
  controller = nextController;
  loading.value = true;
  error.value = '';
  try {
    const result = await listMemos(
      {
        from: from.value || undefined,
        page: targetPage,
        pageSize: pageSize.value,
        q: appliedQuery.value || undefined,
        to: to.value || undefined,
      },
      nextController.signal
    );
    if (nextController.signal.aborted) return;
    items.value = result.items;
    page.value = result.page;
    total.value = result.total;
    hasMore.value = result.hasMore;
  } catch (error_) {
    if (!isCanceledRequest(error_)) error.value = errorMessage(error_);
  } finally {
    if (controller === nextController) {
      controller = undefined;
      loading.value = false;
    }
  }
}

async function applyQuery() {
  appliedQuery.value = query.value.trim();
  page.value = 1;
  await router.replace({
    query: {
      from: from.value || undefined,
      q: appliedQuery.value || undefined,
      to: to.value || undefined,
    },
  });
  await load(1);
}

async function changePage(value: number) {
  page.value = value;
  await router.replace({
    query: {
      from: from.value || undefined,
      page: value > 1 ? String(value) : undefined,
      q: appliedQuery.value || undefined,
      to: to.value || undefined,
    },
  });
  await load(value);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function onDetailFiles(fileList: File[]) {
  const next = [...detailFiles.value];
  for (const file of fileList) {
    if (file.size > 20 * 1024 * 1024) {
      detailError.value = `${file.name} 不能超过 20 MB`;
      message.error(detailError.value);
      continue;
    }
    if (file.type.startsWith('audio/')) {
      detailError.value = '不支持音频附件';
      message.error(detailError.value);
      continue;
    }
    if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file);
  }
  if ((selectedMemo.value?.attachments.length ?? 0) + next.length > 12) {
    detailError.value = '每条 Memo 最多上传 12 个附件';
    detailFiles.value = next.slice(
      0,
      Math.max(0, 12 - (selectedMemo.value?.attachments.length ?? 0))
    );
    message.error(detailError.value);
    return;
  }
  detailFiles.value = next;
  detailError.value = '';
}

async function openMemo(id: string) {
  selectedMemoId.value = id;
  detailDrawerOpen.value = true;
  editOpen.value = false;
  selectedMemo.value = null;
  detailModel.text = '';
  detailInitialText.value = '';
  detailError.value = '';
  detailFiles.value = [];
  detailLoading.value = true;
  try {
    const result = await getMemo(id);
    if (selectedMemoId.value !== id) return;
    selectedMemo.value = result;
    detailModel.text = result.text;
    detailInitialText.value = result.text;
  } catch (error_) {
    if (selectedMemoId.value === id) detailError.value = errorMessage(error_);
  } finally {
    if (selectedMemoId.value === id) detailLoading.value = false;
  }
}

function closeMemo() {
  detailDrawerOpen.value = false;
}

function closeEditor() {
  if (detailDirty.value && !window.confirm('Memo 还有未保存的修改，确定关闭吗？')) return;
  editOpen.value = false;
}

function editMemo() {
  detailDrawerOpen.value = false;
  editOpen.value = true;
}

function clearMemo() {
  selectedMemoId.value = '';
  selectedMemo.value = null;
  detailModel.text = '';
  detailInitialText.value = '';
  detailError.value = '';
  detailFiles.value = [];
}

async function saveMemo() {
  if (!selectedMemo.value || detailSaving.value) return;
  if (
    detailModel.text.trim().length === 0 &&
    selectedMemo.value.attachments.length === 0 &&
    detailFiles.value.length === 0
  ) {
    detailError.value = '正文或附件至少填写一项';
    message.error(detailError.value);
    return;
  }
  detailSaving.value = true;
  detailError.value = '';
  try {
    let updated = selectedMemo.value;
    if (detailModel.text !== detailInitialText.value) {
      updated = await updateMemo(selectedMemo.value.id, {
        text: detailModel.text,
        version: selectedMemo.value.version,
      });
    }
    if (detailFiles.value.length > 0) {
      updated = await uploadMemoAttachments(updated.id, detailFiles.value);
    }
    selectedMemo.value = updated;
    detailModel.text = updated.text;
    detailInitialText.value = updated.text;
    detailFiles.value = [];
    message.success('Memo 已保存');
    editOpen.value = false;
    detailDrawerOpen.value = true;
    await load(page.value);
  } catch (error_) {
    detailError.value = errorMessage(error_) || '保存 Memo 失败';
    message.error(detailError.value);
  } finally {
    detailSaving.value = false;
  }
}

function removeMemo() {
  if (!selectedMemo.value) return;
  Modal.confirm({
    cancelText: '取消',
    content: '删除后 Memo 和附件都无法恢复，请确认。',
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除这条 Memo？',
    async onOk() {
      await deleteMemo(selectedMemo.value!.id);
      message.success('Memo 已删除');
      editOpen.value = false;
      detailDrawerOpen.value = false;
      clearMemo();
      await load(page.value);
    },
  });
}

onMounted(() => void load());
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <PageFrame
    kicker="MEMORY CENTER"
    title="Memo 时间流"
    subtitle="记录想法、资料和需要稍后整理的内容。"
  >
    <template #actions>
      <Button type="primary" @click="router.push('/memory/new')">新建 Memo</Button>
    </template>

    <section class="market-panel memo-filter-bar">
      <Input
        v-model:value="query"
        class="memo-search-input"
        placeholder="搜索 Memo 正文或附件名"
        @press-enter="applyQuery"
      />
      <DatePicker
        v-model:value="from"
        aria-label="开始日期"
        class="memo-date-picker"
        placeholder="开始日期"
        value-format="YYYY-MM-DD"
      />
      <DatePicker
        v-model:value="to"
        aria-label="结束日期"
        class="memo-date-picker"
        placeholder="结束日期"
        value-format="YYYY-MM-DD"
      />
      <Button :loading="loading" @click="applyQuery">查询</Button>
    </section>

    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <Result v-else-if="error" status="error" title="读取 Memo 失败" :sub-title="error">
      <template #extra><Button @click="load()">重试</Button></template>
    </Result>
    <section v-else class="market-panel memory-stream">
      <div class="memory-stream-heading">
        <strong>{{ total }}</strong><span>条记录</span>
      </div>
      <Empty v-if="items.length === 0" description="还没有 Memo 记录" />
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="memo-list-item"
        @click="openMemo(item.id)"
      >
        <div class="memo-list-meta">
          <Tag color="green">文本 Memo</Tag>
          <span>{{ formatTradingDateTime(item.createdAt) }}</span>
        </div>
        <p>{{ item.text || '这条 Memo 只有附件。' }}</p>
        <div v-if="item.attachments.length > 0" class="memo-attachment-summary">
          <span>{{ item.attachments.length }} 个附件</span>
          <span v-for="attachment in item.attachments.slice(0, 3)" :key="attachment.id">{{
            attachment.fileName
          }}</span>
        </div>
      </button>
      <Pagination
        v-if="total > 0 && total > pageSize"
        :current="page"
        :page-size="pageSize"
        :total="total"
        :show-size-changer="false"
        show-less-items
        @change="changePage"
      />
      <p v-if="total > 0 && !hasMore" class="memory-end">已显示全部记录</p>
    </section>

    <Drawer
      :open="detailDrawerOpen"
      width="min(52rem, 96vw)"
      placement="right"
      :destroy-on-close="true"
      @cancel="closeMemo"
      @close="closeMemo"
    >
      <template #title v-if="selectedMemo">
        <div class="detail-title">
          <span>MEMO · {{ formatTradingDateTime(selectedMemo.createdAt) }}</span>
          <strong>Memo 详情</strong>
        </div>
      </template>

      <template #extra v-if="selectedMemo">
        <Button type="primary" @click="editMemo"><EditOutlined />编辑</Button>
      </template>

      <Skeleton v-if="detailLoading" active :paragraph="{ rows: 8 }" />
      <Result
        v-else-if="detailError && !selectedMemo"
        status="error"
        title="读取 Memo 失败"
        :sub-title="detailError"
      >
        <template #extra><Button @click="openMemo(selectedMemoId)">重试</Button></template>
      </Result>
      <div v-else-if="selectedMemo" class="memo-detail-drawer">
        <section class="market-panel memo-content-panel">
          <div class="page-kicker">MEMO CONTENT</div>
          <MarkdownDocument :markdown="selectedMemo.text" />
        </section>
        <section v-if="selectedMemo.attachments.length > 0" class="market-panel memo-detail-attachments">
          <h3>附件</h3>
          <div
            v-for="attachment in selectedMemo.attachments"
            :key="attachment.id"
            class="memo-attachment-card"
          >
            <Image
              v-if="attachment.contentType.startsWith('image/')"
              :src="apiUrl(attachment.accessUrl)"
              :alt="attachment.fileName"
              :width="72"
              :height="72"
              preview
            />
            <div>
              <strong>{{ attachment.fileName }}</strong><small>{{ formatBytes(attachment.size) }} · {{ formatTradingDateTime(attachment.createdAt) }}</small>
            </div>
            <Button type="link" :href="apiUrl(attachment.accessUrl)" target="_blank">打开</Button>
          </div>
        </section>
      </div>
    </Drawer>

    <Modal
      :open="editOpen"
      centered
      width="min(46rem, 94vw)"
      :destroy-on-close="true"
      :footer="null"
      wrap-class-name="memo-detail-modal"
      @cancel="closeEditor"
    >
      <template #title>
        <div class="detail-title">
          <span>MEMO EDITOR</span>
          <strong>编辑 Memo</strong>
        </div>
      </template>

      <div v-if="selectedMemo" class="memo-modal-body">
        <textarea
          v-model="detailModel.text"
          class="memo-editor-textarea"
          rows="10"
          placeholder="写下一段文字"
        ></textarea>
        <p v-if="detailError" class="form-alert" role="alert">{{ detailError }}</p>
        <div class="memo-upload-row">
          <Upload
            :before-upload="
              (file) => {
                onDetailFiles([file]);
                return false;
              }
            "
            :show-upload-list="false"
            :multiple="true"
          >
            <Button>添加图片/文件</Button>
          </Upload>
          <span class="muted">最多 12 个文件，单个不超过 20 MB</span>
        </div>
        <div v-if="detailFiles.length > 0" class="memo-pending-files">
          <Tag
            v-for="file in detailFiles"
            :key="`${file.name}-${file.size}`"
            closable
            @close="detailFiles = detailFiles.filter((item) => item !== file)"
          >
            {{ file.name }} · {{ formatBytes(file.size) }}
          </Tag>
        </div>
        <div v-if="selectedMemo.attachments.length > 0" class="memo-detail-attachments">
          <h3>附件</h3>
          <div
            v-for="attachment in selectedMemo.attachments"
            :key="attachment.id"
            class="memo-attachment-card"
          >
            <Image
              v-if="attachment.contentType.startsWith('image/')"
              :src="apiUrl(attachment.accessUrl)"
              :alt="attachment.fileName"
              :width="72"
              :height="72"
              preview
            />
            <div>
              <strong>{{ attachment.fileName }}</strong><small>{{ formatBytes(attachment.size) }} · {{ formatTradingDateTime(attachment.createdAt) }}</small>
            </div>
            <Button type="link" :href="apiUrl(attachment.accessUrl)" target="_blank">打开</Button>
          </div>
        </div>
        <div class="memo-modal-actions">
          <Button danger @click="removeMemo">删除</Button>
          <Button @click="closeEditor">关闭</Button>
          <Button type="primary" :loading="detailSaving" @click="saveMemo">保存</Button>
        </div>
      </div>
    </Modal>
  </PageFrame>
</template>
