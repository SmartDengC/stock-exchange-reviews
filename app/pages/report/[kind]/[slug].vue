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
  <AppShell module="research" :title="record.title" :subtitle="record.dateLabel">
    <template #actions>
      <NuxtLink class="secondary-link" to="/#archives">返回归档</NuxtLink>
    </template>

    <article class="report-page report-surface">
      <section class="report-hero">
        <span class="eyebrow">{{ record.kind === "weekly" ? "WEEKLY REVIEW" : "DAILY REVIEW" }} / {{ record.slug }}</span>
        <h1>{{ record.title }}</h1>
        <p>{{ record.dateLabel }}</p>
      </section>
      <ReviewDocumentEditor :review="record" />
    </article>
  </AppShell>
</template>
