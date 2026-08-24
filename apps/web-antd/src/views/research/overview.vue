<script lang="ts" setup>
import type { ResearchReview } from '#/types/research';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button, Card, Drawer, Empty, Result, Skeleton, Tag } from 'ant-design-vue';

import { listResearchReviews } from '#/api';
import MarkdownDocument from '#/components/markdown-document.vue';
import MetricCard from '#/components/metric-card.vue';
import PageFrame from '#/components/page-frame.vue';
import {
  changeTone,
  findRow,
  firstTable,
  tableForHeading,
} from '#/lib/reviews';
import { errorMessage } from '#/lib/trading';

const router = useRouter();
const review = ref<null | ResearchReview>(null);
const loading = ref(true);
const error = ref('');
const drawerOpen = ref(false);

function assetFrom(
  table: ReturnType<typeof firstTable>,
  name: string,
  label: string,
  meta: string,
): {
  change: string;
  label: string;
  meta: string;
  tone: 'negative' | 'neutral' | 'positive';
  value: string;
} {
  const row = findRow(table, name);
  const value = row?.at(-2) ?? '—';
  const change = row?.at(-1) ?? '—';
  return {
    change,
    label,
    meta,
    tone: changeTone(change) as 'negative' | 'neutral' | 'positive',
    value,
  };
}

const assets = computed(() => {
  const raw = review.value?.content ?? '';
  return [
    assetFrom(firstTable(raw, 'A股'), '上证', '上证指数', 'A 股'),
    assetFrom(firstTable(raw, '港股'), '恒生指数', '恒生指数', '港 股'),
    assetFrom(firstTable(raw, '黄金'), '现货黄金', '现货黄金', '贵金属'),
    assetFrom(firstTable(raw, '布伦特'), '布伦特', '布伦特原油', '大宗商品'),
  ];
});

const strongest = computed(() =>
  tableForHeading(review.value?.content ?? '', '周度最强'),
);
const weakest = computed(() =>
  tableForHeading(review.value?.content ?? '', '周度最惨'),
);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const reviews = await listResearchReviews({ kind: 'weekly' });
    review.value = reviews[0] ?? null;
  } catch (error_) {
    error.value = errorMessage(error_);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <PageFrame
    title="周度研究终端"
    :subtitle="review ? `最新资料 ${review.slug} · ${review.dateLabel}` : '跨市场表现、板块轮动与研究归档。'"
  >
    <template #actions>
      <Button @click="router.push('/research/weekly')">查看归档</Button>
      <Button type="primary" @click="router.push('/research/edit/weekly')">新建周复盘</Button>
    </template>

    <section v-if="loading" class="terminal-panel state-panel"><Skeleton active /></section>
    <Result v-else-if="error" status="error" title="读取周复盘失败" :sub-title="error">
      <template #extra><Button @click="load">重试</Button></template>
    </Result>
    <section v-else-if="review">
      <div class="metric-grid">
        <MetricCard
          v-for="asset in assets"
          :key="asset.label"
          :change="asset.change"
          :label="asset.label"
          :meta="asset.meta"
          :tone="asset.tone"
          :value="asset.value"
        />
      </div>

      <div class="section-grid">
        <Card class="terminal-panel" :bordered="false" title="相对强势">
          <div v-if="strongest?.rows.length" class="rank-list">
            <div v-for="row in strongest.rows.slice(0, 6)" :key="row[0]">
              <strong>{{ row[0] }}</strong><span>{{ row[1] }}</span><small>{{ row[2] }}</small>
            </div>
          </div>
          <Empty v-else description="暂无结构化强势板块数据" />
        </Card>
        <Card class="terminal-panel" :bordered="false" title="持续承压">
          <div v-if="weakest?.rows.length" class="rank-list">
            <div v-for="row in weakest.rows.slice(0, 6)" :key="row[0]">
              <strong>{{ row[0] }}</strong><span>{{ row[1] }}</span><small>{{ row[2] }}</small>
            </div>
          </div>
          <Empty v-else description="暂无结构化弱势板块数据" />
        </Card>
        <Card class="terminal-panel wide research-source" :bordered="false">
          <Tag color="green">{{ review.slug }}</Tag>
          <h2>{{ review.title }}</h2>
          <p>{{ review.dateLabel }}</p>
          <div class="page-actions">
            <Button @click="drawerOpen = true">快速阅读</Button>
            <Button type="primary" @click="router.push(`/report/weekly/${review.slug}`)">打开完整报告</Button>
          </div>
        </Card>
      </div>
    </section>
    <section v-else class="terminal-panel state-panel">
      <Empty description="尚未创建周复盘">
        <Button type="primary" @click="router.push('/research/edit/weekly')">新建周复盘</Button>
      </Empty>
    </section>

    <Drawer v-model:open="drawerOpen" width="min(52rem, 92vw)" :title="review?.title">
      <MarkdownDocument v-if="review" :markdown="review.content" />
    </Drawer>
  </PageFrame>
</template>
