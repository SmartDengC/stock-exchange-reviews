<script lang="ts">
import type { ResearchReview as CachedResearchReview } from '#/types/research';

const archiveCache = new Map<string, CachedResearchReview[]>();
</script>

<script lang="ts" setup>
import type { ResearchReview } from '#/types/research';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { EditOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  Result,
  Segmented,
  Skeleton,
  Tag,
  Textarea,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  deleteResearchReview,
  getResearchReview,
  isCanceledRequest,
  listResearchReviews,
  saveResearchReview,
} from '#/api';
import MarkdownDocument from '#/components/markdown-document.vue';
import PageFrame from '#/components/page-frame.vue';
import { sortResearchReviewsByArchiveIdentifier } from '#/lib/reviews';
import { currentTradingDate, errorMessage, formatTradingDateTime } from '#/lib/trading';

const props = defineProps<{ kind: 'daily' | 'weekly' }>();
const route = useRoute();
const router = useRouter();
const reviews = ref<ResearchReview[]>([]);
const selectedReview = ref<null | ResearchReview>(null);
const drawerOpen = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const editorOpen = ref(false);
const editorSaving = ref(false);
const editorError = ref('');
const editorMode = ref<'edit' | 'preview'>('edit');
const editorVersion = ref<number>();
const editorModel = ref({ content: '', dateLabel: '', title: '' });
const loading = ref(true);
const error = ref('');
const query = ref(typeof route.query.q === 'string' ? route.query.q : '');
const dateFrom = ref(
  typeof route.query.dateFrom === 'string'
    ? route.query.dateFrom
    : defaultDateFrom(),
);
const dateTo = ref(
  typeof route.query.dateTo === 'string'
    ? route.query.dateTo
    : defaultDateTo(),
);
let refreshController: AbortController | undefined;

function defaultDateFrom() {
  if (props.kind !== 'daily') return '';
  return dayjs(currentTradingDate()).subtract(7, 'day').format('YYYY-MM-DD');
}

function defaultDateTo() {
  if (props.kind !== 'daily') return '';
  return currentTradingDate();
}

const kindLabel = computed(() => (props.kind === 'weekly' ? '周' : '日'));

function cacheKey() {
  return JSON.stringify({
    dateFrom: dateFrom.value || '',
    dateTo: dateTo.value || '',
    kind: props.kind,
    q: query.value || '',
  });
}

async function refresh() {
  refreshController?.abort();
  const controller = new AbortController();
  refreshController = controller;
  loading.value = true;
  error.value = '';
  try {
    const result = await listResearchReviews({
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      kind: props.kind,
      q: query.value || undefined,
    }, controller.signal);
    if (controller.signal.aborted) return;
    // 对 weekly 复盘按周号降序排序（最新的周在前面）
    // daily 复盘保持接口返回的原始顺序
    const sortedReviews = sortResearchReviewsByArchiveIdentifier(
      result,
      props.kind,
    );
    reviews.value = sortedReviews;
    archiveCache.set(cacheKey(), sortedReviews);
    await router.replace({
      query: {
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined,
        q: query.value || undefined,
      },
    });
  } catch (error_) {
    if (!isCanceledRequest(error_)) error.value = errorMessage(error_);
  } finally {
    if (refreshController === controller) {
      refreshController = undefined;
      loading.value = false;
    }
  }
}

async function openReview(review: ResearchReview) {
  selectedReview.value = review;
  drawerOpen.value = true;
  detailLoading.value = true;
  detailError.value = '';
  try {
    selectedReview.value = await getResearchReview(review.kind, review.slug);
  } catch (error_) {
    detailError.value = errorMessage(error_);
  } finally {
    detailLoading.value = false;
  }
}

const editorDirty = computed(
  () =>
    Boolean(selectedReview.value) &&
    (editorModel.value.content !== selectedReview.value?.content ||
      editorModel.value.dateLabel !== selectedReview.value?.dateLabel ||
      editorModel.value.title !== selectedReview.value?.title),
);

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function openEditor() {
  if (!selectedReview.value) return;
  drawerOpen.value = false;
  editorModel.value = {
    content: selectedReview.value.content,
    dateLabel: selectedReview.value.dateLabel,
    title: selectedReview.value.title,
  };
  editorVersion.value = selectedReview.value.version;
  editorMode.value = 'edit';
  editorError.value = '';
  editorOpen.value = true;
}

function closeEditor() {
  if (editorDirty.value && !window.confirm('复盘还有未保存的修改，确定关闭吗？')) return;
  editorOpen.value = false;
}

async function saveEditor() {
  const review = selectedReview.value;
  if (!review || editorSaving.value) return;
  editorError.value = '';
  if (props.kind === 'daily' && !isValidIsoDate(editorModel.value.dateLabel.trim())) {
    editorError.value = '日期标签必须为 YYYY-MM-DD 格式的真实日期，例如 2026-08-26。';
    return;
  }
  if (!editorModel.value.title.trim() || !editorModel.value.content.trim()) {
    editorError.value = '标题和复盘内容不能为空。';
    return;
  }
  editorSaving.value = true;
  try {
    const updated = await saveResearchReview(review.kind, review.slug, {
      content: editorModel.value.content,
      dateLabel: editorModel.value.dateLabel,
      title: editorModel.value.title,
      version: editorVersion.value,
    });
    selectedReview.value = updated;
    reviews.value = reviews.value.map((item) => (item.id === updated.id ? updated : item));
    editorOpen.value = false;
    drawerOpen.value = true;
  } catch (error_) {
    editorError.value = errorMessage(error_);
  } finally {
    editorSaving.value = false;
  }
}

function removeReview() {
  const review = selectedReview.value;
  if (!review) return;
  Modal.confirm({
    cancelText: '取消',
    content: '删除后无法从界面恢复，请确认这份复盘已经不再需要。',
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除这份复盘？',
    async onOk() {
      await deleteResearchReview(review.kind, review.slug);
      editorOpen.value = false;
      drawerOpen.value = false;
      selectedReview.value = null;
      reviews.value = reviews.value.filter((item) => item.id !== review.id);
    },
  });
}

onMounted(() => {
  const cachedReviews = archiveCache.get(cacheKey());
  if (cachedReviews) {
    reviews.value = cachedReviews;
    loading.value = false;
    return;
  }
  void refresh();
});
onBeforeUnmount(() => refreshController?.abort());
</script>

<template>
  <PageFrame
    :title="`${kindLabel}复盘归档`"
    :subtitle="`${reviews.length} 篇${kindLabel}度研究，支持按日期和关键词筛选。`"
  >
    <Card class="terminal-panel filter-panel" :bordered="false">
      <div class="filters-grid">
        <Input.Search
          v-model:value="query"
          allow-clear
          placeholder="搜索标题或正文"
        />
        <DatePicker
          v-model:value="dateFrom"
          value-format="YYYY-MM-DD"
          placeholder="开始日期"
        />
        <DatePicker
          v-model:value="dateTo"
          value-format="YYYY-MM-DD"
          placeholder="结束日期"
        />
        <Button @click="refresh">查询</Button>
        <Button type="primary" @click="router.push(`/research/edit/${kind}`)">
          新建{{ kindLabel }}复盘
        </Button>
      </div>
    </Card>

    <Card class="terminal-panel archive-panel" :bordered="false">
      <Skeleton v-if="loading" active :paragraph="{ rows: 6 }" />
      <Result v-else-if="error" status="error" title="读取复盘失败" :sub-title="error">
        <template #extra><Button @click="refresh">重试</Button></template>
      </Result>
      <div v-else-if="reviews.length > 0" class="archive-table-wrap">
        <table class="archive-table">
          <thead>
            <tr>
              <th>标识</th><th>标题</th><th>日期</th><th>更新时间</th><th class="sr-only">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reviews" :key="item.id" @click="openReview(item)">
              <td><Tag>{{ item.slug }}</Tag></td>
              <td>{{ item.title }}</td>
              <td>{{ item.dateLabel }}</td>
              <td>{{ formatTradingDateTime(item.updatedAt) }}</td>
              <td><Button type="link" @click.stop="openReview(item)">阅读</Button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Empty v-else :description="`暂无${kindLabel}复盘数据`">
        <Button type="primary" @click="router.push(`/research/edit/${kind}`)">
          新建{{ kindLabel }}复盘
        </Button>
      </Empty>
    </Card>

    <Drawer
      v-model:open="drawerOpen"
      placement="right"
      width="min(52rem, 96vw)"
      :destroy-on-close="true"
    >
      <template v-if="selectedReview" #title>
        <div class="detail-title">
          <span>{{ selectedReview.kind === 'weekly' ? '周复盘' : '日复盘' }} · {{ selectedReview.dateLabel }}</span>
          <strong>{{ selectedReview.title }}</strong>
        </div>
      </template>
      <template v-if="selectedReview" #extra>
        <Button type="primary" @click="openEditor"><EditOutlined />编辑</Button>
      </template>

      <Skeleton v-if="detailLoading" active :paragraph="{ rows: 12 }" />
      <Result v-else-if="detailError" status="error" title="读取复盘详情失败" :sub-title="detailError">
        <template #extra><Button @click="selectedReview && openReview(selectedReview)">重试</Button></template>
      </Result>
      <MarkdownDocument v-else-if="selectedReview" :markdown="selectedReview.content" />
    </Drawer>

    <Modal
      v-model:open="editorOpen"
      centered
      width="min(58rem, 94vw)"
      :footer="null"
      wrap-class-name="research-edit-modal"
      @cancel="closeEditor"
    >
      <template #title>
        <div class="detail-title">
          <span>RESEARCH EDITOR</span>
          <strong>编辑{{ kindLabel }}复盘</strong>
        </div>
      </template>

      <div class="research-editor-body">
        <Form :model="editorModel" layout="vertical">
          <div class="research-editor-fields">
            <FormItem label="标题" required>
              <Input v-model:value="editorModel.title" placeholder="例：2026 年第 33 周市场周报" />
            </FormItem>
            <FormItem label="日期标签">
              <Input
                v-model:value="editorModel.dateLabel"
                :placeholder="kind === 'weekly' ? '2026年8月10日-14日 或 2026-W33' : '2026-08-26'"
              />
            </FormItem>
            <FormItem label="编号">
              <Input :value="selectedReview?.slug" disabled />
            </FormItem>
          </div>
        </Form>

        <Segmented
          v-model:value="editorMode"
          :options="[
            { label: '编辑', value: 'edit' },
            { label: '预览', value: 'preview' },
          ]"
        />
        <Textarea
          v-if="editorMode === 'edit'"
          v-model:value="editorModel.content"
          :auto-size="{ minRows: 20 }"
          placeholder="粘贴或输入 Markdown 内容"
        />
        <div v-else class="preview-surface">
          <MarkdownDocument :markdown="editorModel.content" />
        </div>
        <p v-if="editorError" class="form-alert" role="alert">{{ editorError }}</p>
        <div class="memo-modal-actions">
          <Button danger @click="removeReview">删除</Button>
          <Button @click="closeEditor">关闭</Button>
          <Button type="primary" :loading="editorSaving" @click="saveEditor">保存</Button>
        </div>
      </div>
    </Modal>
  </PageFrame>
</template>
