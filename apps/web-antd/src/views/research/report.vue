<script lang="ts" setup>
import type { ResearchReview } from '#/types/research';

import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Button, Card, Result, Skeleton, Tag } from 'ant-design-vue';

import { getResearchReview } from '#/api';
import MarkdownDocument from '#/components/markdown-document.vue';
import PageFrame from '#/components/page-frame.vue';
import { errorMessage } from '#/lib/trading';

const route = useRoute();
const router = useRouter();
const review = ref<null | ResearchReview>(null);
const loading = ref(true);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    review.value = await getResearchReview(
      route.path.includes('/report/daily/') ? 'daily' : 'weekly',
      String(route.params.slug),
    );
  } catch (error_) {
    review.value = null;
    error.value = errorMessage(error_);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => route.fullPath, load);

function backToArchive() {
  const kind = review.value?.kind || (route.path.includes('/report/daily/') ? 'daily' : 'weekly');
  const previousPath = typeof window.history.state?.back === 'string'
    ? window.history.state.back
    : '';
  if (previousPath.startsWith(`/research/${kind}`)) {
    router.back();
    return;
  }
  void router.push(`/research/${kind}`);
}
</script>

<template>
  <PageFrame
    :title="review?.title || (loading ? '读取复盘' : '未找到这份复盘')"
    :subtitle="review?.dateLabel"
    :kicker="review ? `${review.kind === 'weekly' ? 'WEEKLY' : 'DAILY'} REVIEW / ${review.slug}` : 'MARKET DIARY'"
  >
    <template #actions>
      <Button @click="backToArchive">返回归档</Button>
      <Button v-if="review" type="primary" @click="router.push(`/research/edit/${review.kind}/${review.slug}`)">编辑</Button>
    </template>

    <Card v-if="loading" class="terminal-panel" :bordered="false">
      <Skeleton active :paragraph="{ rows: 12 }" />
    </Card>
    <Result v-else-if="!review" status="404" title="未找到这份复盘" :sub-title="error">
      <template #extra><Button type="primary" @click="router.push('/')">返回研究终端</Button></template>
    </Result>
    <article v-else class="terminal-panel report-surface">
      <header class="report-heading">
        <Tag color="green">{{ review.slug }}</Tag>
        <h2>{{ review.title }}</h2>
        <p>{{ review.dateLabel }}</p>
      </header>
      <MarkdownDocument :markdown="review.content" />
    </article>
  </PageFrame>
</template>
