<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  Modal,
  Segmented,
  Skeleton,
  Textarea,
} from 'ant-design-vue';

import {
  deleteResearchReview,
  getResearchReview,
  saveResearchReview,
} from '#/api';
import MarkdownDocument from '#/components/markdown-document.vue';
import PageFrame from '#/components/page-frame.vue';
import { generateReviewSlug } from '#/lib/reviews';
import { errorMessage } from '#/lib/trading';

const route = useRoute();
const router = useRouter();
const segments = computed(() => {
  const value = route.params.params;
  return (Array.isArray(value) ? value : [value]).filter(Boolean) as string[];
});
const kind = computed<'daily' | 'weekly'>(() =>
  segments.value[0] === 'weekly' ? 'weekly' : 'daily',
);
const slug = computed(() => segments.value[1] || '');
const isEdit = computed(() => Boolean(slug.value));
const kindLabel = computed(() => (kind.value === 'weekly' ? '周复盘' : '日复盘'));

const model = reactive({ content: '', dateLabel: '', title: '' });
const version = ref<number>();
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const mode = ref<'edit' | 'preview'>('edit');
const initialSnapshot = ref('');

function snapshot() {
  return JSON.stringify(model);
}

const generatedSlug = computed(() =>
  slug.value || generateReviewSlug(kind.value, model.dateLabel, model.title),
);
const dirty = computed(
  () => Boolean(initialSnapshot.value) && snapshot() !== initialSnapshot.value,
);

async function load() {
  if (!isEdit.value) {
    initialSnapshot.value = snapshot();
    return;
  }
  loading.value = true;
  try {
    const existing = await getResearchReview(kind.value, slug.value);
    model.title = existing.title;
    model.dateLabel = existing.dateLabel;
    model.content = existing.content;
    version.value = existing.version;
    initialSnapshot.value = snapshot();
  } catch (error_) {
    error.value = errorMessage(error_);
  } finally {
    loading.value = false;
  }
}

async function save() {
  error.value = '';
  const targetSlug = generatedSlug.value;
  if (!targetSlug) {
    error.value =
      kind.value === 'weekly'
        ? '无法生成编号：请填写日期、周号或在标题中注明“某年第某周”。'
        : '无法生成编号：请填写 2026年8月14日 或 2026-08-14 格式的日期。';
    return;
  }
  if (!model.title.trim() || !model.content.trim()) {
    error.value = '标题和复盘内容不能为空。';
    return;
  }

  saving.value = true;
  try {
    const result = await saveResearchReview(kind.value, targetSlug, {
      content: model.content,
      dateLabel: model.dateLabel,
      title: model.title,
      version: version.value,
    });
    initialSnapshot.value = snapshot();
    await router.push(`/report/${kind.value}/${result.slug}`);
  } catch (error_) {
    error.value = errorMessage(error_);
  } finally {
    saving.value = false;
  }
}

function remove() {
  if (!slug.value) return;
  Modal.confirm({
    cancelText: '取消',
    content: '删除后无法从界面恢复，请确认这份复盘已经不再需要。',
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除这份复盘？',
    async onOk() {
      try {
        await deleteResearchReview(kind.value, slug.value);
        initialSnapshot.value = snapshot();
        await router.push(`/research/${kind.value}`);
      } catch (error_) {
        error.value = errorMessage(error_);
        throw error_;
      }
    },
  });
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = '';
}
onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload);
  load();
});
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload));
onBeforeRouteLeave(
  () => !dirty.value || window.confirm('复盘还有未保存的修改，确定离开吗？'),
);
</script>

<template>
  <PageFrame
    :title="`${isEdit ? '编辑' : '新建'}${kindLabel}`"
    subtitle="Markdown 内容会在保存前保留原文，在展示时统一清理危险 HTML。"
  >
    <template #actions>
      <Button @click="router.push(`/research/${kind}`)">返回归档</Button>
      <Button v-if="isEdit" danger @click="remove">删除</Button>
      <Button type="primary" :loading="saving" @click="save">保存</Button>
    </template>

    <Card class="terminal-panel editor-card" :bordered="false">
      <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
      <template v-else>
        <Form :model="model" layout="vertical">
          <div class="editor-fields">
            <FormItem label="标题" required>
              <Input v-model:value="model.title" placeholder="例：2026 年第 33 周市场周报" />
            </FormItem>
            <FormItem label="日期标签">
              <Input
                v-model:value="model.dateLabel"
                :placeholder="kind === 'weekly' ? '2026年8月10日-14日 或 2026-W33' : '2026年8月14日（周五）'"
              />
            </FormItem>
            <FormItem label="编号">
              <Input :value="generatedSlug" disabled placeholder="根据日期自动生成" />
            </FormItem>
          </div>
        </Form>

        <div class="editor-mode">
          <Segmented v-model:value="mode" :options="[{ label: '编辑', value: 'edit' }, { label: '预览', value: 'preview' }]" />
        </div>
        <Textarea
          v-if="mode === 'edit'"
          v-model:value="model.content"
          class="review-textarea"
          :auto-size="{ minRows: 20 }"
          placeholder="粘贴或输入 Markdown 内容"
        />
        <div v-else class="preview-surface">
          <MarkdownDocument :markdown="model.content" />
        </div>
        <p v-if="error" class="form-alert" role="alert">{{ error }}</p>
      </template>
    </Card>
  </PageFrame>
</template>
