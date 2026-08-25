<script lang="ts" setup>
import type { ResearchReview } from '#/types/research';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Result,
  Skeleton,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { isCanceledRequest, listResearchReviews } from '#/api';
import { currentTradingDate, errorMessage, formatTradingDateTime } from '#/lib/trading';

const props = defineProps<{ kind: 'daily' | 'weekly' }>();
const route = useRoute();
const router = useRouter();
const reviews = ref<ResearchReview[]>([]);
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

async function refresh() {
  refreshController?.abort();
  const controller = new AbortController();
  refreshController = controller;
  loading.value = true;
  error.value = '';
  try {
    reviews.value = await listResearchReviews({
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      kind: props.kind,
      q: query.value || undefined,
    }, controller.signal);
    if (controller.signal.aborted) return;
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

function clearFilters() {
  query.value = '';
  dateFrom.value = defaultDateFrom();
  dateTo.value = defaultDateTo();
  return refresh();
}

onMounted(refresh);
onBeforeUnmount(() => refreshController?.abort());
</script>

<template>
  <PageFrame
    :title="`${kindLabel}复盘归档`"
    :subtitle="`${reviews.length} 篇${kindLabel}度研究，支持按日期和关键词筛选。`"
  >
    <template #actions>
      <Button type="primary" @click="router.push(`/research/edit/${kind}`)">
        新建{{ kindLabel }}复盘
      </Button>
    </template>

    <Card class="terminal-panel filter-panel" :bordered="false">
      <div class="filters-grid">
        <Input.Search
          v-model:value="query"
          allow-clear
          placeholder="搜索标题或正文"
          @search="refresh"
        />
        <DatePicker
          v-model:value="dateFrom"
          value-format="YYYY-MM-DD"
          placeholder="开始日期"
          @change="refresh"
        />
        <DatePicker
          v-model:value="dateTo"
          value-format="YYYY-MM-DD"
          placeholder="结束日期"
          @change="refresh"
        />
        <Button v-if="query || dateFrom || dateTo" @click="clearFilters">清除筛选</Button>
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
            <tr v-for="item in reviews" :key="item.id" @click="router.push(`/report/${item.kind}/${item.slug}`)">
              <td><Tag>{{ item.slug }}</Tag></td>
              <td>{{ item.title }}</td>
              <td>{{ item.dateLabel }}</td>
              <td>{{ formatTradingDateTime(item.updatedAt) }}</td>
              <td><Button type="link" @click.stop="router.push(`/report/${item.kind}/${item.slug}`)">阅读</Button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Empty v-else :description="`暂无${kindLabel}复盘数据`" />
    </Card>
  </PageFrame>
</template>
