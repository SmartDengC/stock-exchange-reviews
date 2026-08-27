<script lang="ts" setup>
import type { Memo } from '#/shared/types/memory';

import { computed, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import { Button, Card, Image, message, Modal, Result, Skeleton, Tag, Upload } from 'ant-design-vue';

import { createMemo, deleteMemo, getMemo, updateMemo } from '#/api';
import { apiUrl } from '#/api/request';
import PageFrame from '#/components/page-frame.vue';
import { errorMessage, formatTradingDateTime } from '#/lib/trading';

const route = useRoute();
const router = useRouter();
const isNew = computed(() => route.name === 'MemoryNew');
const memo = ref<Memo | null>(null);
const model = reactive({ text: '' });
const files = ref<File[]>([]);
const loading = ref(!isNew.value);
const saving = ref(false);
const error = ref('');
const initialText = ref('');
const dirty = computed(() => model.text !== initialText.value || files.value.length > 0);

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function onFiles(fileList: File[]) {
  const next = [...files.value];
  for (const file of fileList) {
    if (file.size > 20 * 1024 * 1024) {
      error.value = `${file.name} 不能超过 20 MB`;
      continue;
    }
    if (file.type.startsWith('audio/')) {
      error.value = '不支持音频附件';
      continue;
    }
    if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file);
  }
  if (next.length > 12) {
    error.value = '每条 Memo 最多上传 12 个附件';
    files.value = next.slice(0, 12);
    return;
  }
  files.value = next;
  error.value = '';
}

async function load() {
  if (isNew.value) return;
  try {
    const result = await getMemo(String(route.params.id));
    memo.value = result;
    model.text = result.text;
    initialText.value = result.text;
  } catch (error_) {
    error.value = errorMessage(error_);
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (model.text.trim().length === 0 && files.value.length === 0 && !memo.value?.attachments.length) {
    error.value = '正文或附件至少填写一项';
    message.error(error.value);
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    if (isNew.value) {
      const created = await createMemo(model.text, files.value);
      memo.value = created;
      initialText.value = created.text;
      files.value = [];
      await router.replace(`/memory/${created.id}`);
    } else if (memo.value) {
      const updated = await updateMemo(String(route.params.id), {
        text: model.text,
        version: memo.value.version,
      });
      memo.value = updated;
      initialText.value = updated.text;
      files.value = [];
    }
    message.success('Memo 已保存');
  } catch (error_) {
    error.value = errorMessage(error_) || '保存 Memo 失败';
    message.error(error.value);
  } finally {
    saving.value = false;
  }
}

function remove() {
  if (!memo.value) return;
  Modal.confirm({
    cancelText: '取消',
    content: '删除后 Memo 和附件都无法恢复，请确认。',
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除这条 Memo？',
    async onOk() {
      await deleteMemo(memo.value!.id);
      await router.push('/memory');
    },
  });
}

onMounted(load);
onBeforeRouteLeave(() => !dirty.value || window.confirm('Memo 还有未保存的修改，确定离开吗？'));
</script>

<template>
  <PageFrame :kicker="isNew ? 'NEW MEMO' : 'MEMO DETAIL'" :title="isNew ? '新建 Memo' : 'Memo 详情'" subtitle="把需要记住的内容先收集下来。">
    <template #actions>
      <Button @click="router.push('/memory')">返回时间流</Button>
      <Button v-if="memo" danger @click="remove">删除</Button>
      <Button type="primary" :loading="saving" @click="save">保存</Button>
    </template>

    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <Result v-else-if="error && !memo && !isNew" status="error" title="读取 Memo 失败" :sub-title="error" />
    <Card v-else class="terminal-panel memo-editor-card" :bordered="false">
      <textarea v-model="model.text" class="memo-editor-textarea" rows="12" placeholder="写下一段文字，或者只添加附件…"></textarea>
      <p v-if="error" class="form-alert" role="alert">{{ error }}</p>
      <div class="memo-upload-row">
        <Upload :before-upload="(file) => { onFiles([file]); return false; }" :show-upload-list="false" :multiple="true">
          <Button>添加图片/文件</Button>
        </Upload>
        <span class="muted">最多 12 个文件，单个不超过 20 MB</span>
      </div>
      <div v-if="files.length > 0" class="memo-pending-files">
        <Tag v-for="file in files" :key="`${file.name}-${file.size}`" closable @close="files = files.filter((item) => item !== file)">
          {{ file.name }} · {{ formatBytes(file.size) }}
        </Tag>
      </div>
      <div v-if="memo && memo.attachments.length > 0" class="memo-detail-attachments">
        <h3>已有附件</h3>
        <div v-for="attachment in memo.attachments" :key="attachment.id" class="memo-attachment-card">
          <Image v-if="attachment.contentType.startsWith('image/')" :src="apiUrl(attachment.accessUrl)" :alt="attachment.fileName" :width="72" :height="72" preview />
          <div><strong>{{ attachment.fileName }}</strong><small>{{ formatBytes(attachment.size) }} · {{ formatTradingDateTime(attachment.createdAt) }}</small></div>
          <Button type="link" :href="apiUrl(attachment.accessUrl)" target="_blank">打开</Button>
        </div>
      </div>
    </Card>
  </PageFrame>
</template>
