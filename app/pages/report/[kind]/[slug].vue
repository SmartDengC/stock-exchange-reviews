<script setup lang="ts">
import { getReview, type ReviewRecord } from "~/lib/reviews";

const route = useRoute();
const kind = Array.isArray(route.params.kind) ? route.params.kind[0] : route.params.kind;
const slug = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug;
const review = kind === "daily" || kind === "weekly" ? getReview(kind, String(slug)) : null;

if (!review) {
  throw createError({ statusCode: 404, statusMessage: "未找到这份复盘" });
}

const record = review as ReviewRecord;

useSeoMeta({
  title: `${record.title} · 市场日记`,
  description: record.dateLabel,
});
</script>

<template>
  <main class="report-page">
    <header class="report-topbar">
      <NuxtLink class="brand" to="/"><span class="brand-mark">M</span><span>市场日记<small>MARKET DIARY</small></span></NuxtLink>
      <div class="topbar-actions"><ThemeToggle /><NuxtLink class="secondary-link" to="/#archives">返回归档 ←</NuxtLink></div>
    </header>

    <article class="report-surface">
      <section class="report-hero">
        <span class="eyebrow">{{ record.kind === "weekly" ? "WEEKLY REVIEW" : "DAILY REVIEW" }} / {{ record.slug }}</span>
        <h1>{{ record.title }}</h1>
        <p>{{ record.dateLabel }}</p>
      </section>
      <ReviewDocumentEditor :review="record" />
    </article>

    <footer>本系统仅用于个人研究与历史复盘，不构成任何投资建议。<span>市场日记 · BUILD-TIME RESEARCH SYSTEM</span></footer>
  </main>
</template>
