<script setup lang="ts">
import { getLatestWeeklyReview } from "~/lib/reviews";

const review = getLatestWeeklyReview();

useSeoMeta({
  title: "市场日记 · 周度研究终端",
  description: "个人市场复盘、跨市场表现、板块轮动与情景推演终端。",
});
</script>

<template>
  <Dashboard v-if="review" :review="review" />
  <main v-else class="empty-state">
    <p class="eyebrow">MARKET DIARY</p>
    <h1>尚未发现市场复盘</h1>
    <p>请将日报放入 reviews/，或将周报放入 reviews/weekly/。</p>
  </main>
</template>
