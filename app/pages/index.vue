<script setup lang="ts">
import { parseTables } from "~/lib/reviews";

const { data: weeklyReviews, status } = useResearchReviewList({ kind: "weekly" });

const review = computed(() => {
  const first = weeklyReviews.value?.[0];
  if (!first) return null;
  return {
    slug: first.slug,
    kind: first.kind,
    title: first.title,
    dateLabel: first.dateLabel,
    raw: first.content,
    tables: parseTables(first.content),
  };
});

useSeoMeta({
  title: "市场日记 · 周度研究终端",
  description: "个人市场复盘、跨市场表现、板块轮动与情景推演终端。",
});
</script>

<template>
  <Dashboard v-if="review" :review="review" />
  <AppShell v-else module="research" title="周度研究终端">
    <main v-if="status === 'pending'" class="loading-state">
      <div class="spinner" />
      <p>加载中...</p>
    </main>
    <main v-else class="empty-state">
      <p class="eyebrow">MARKET DIARY</p>
      <h1>尚未发现市场复盘</h1>
      <p>请前往「复盘总览」新建周复盘数据。</p>
    </main>
  </AppShell>
</template>
