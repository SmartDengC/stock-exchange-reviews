<script setup lang="ts">
import { parseTables } from "~/lib/reviews";

const route = useRoute();
const kind = Array.isArray(route.params.kind) ? route.params.kind[0] : route.params.kind;
const slug = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug;

const { data: apiReview, error: fetchError, pending } = useFetch<ResearchReview>(
  `/api/reviews/${kind}/${slug}`,
  { lazy: true, server: false },
);

const record = computed(() => {
  const r = apiReview.value;
  if (!r) return null;
  return {
    slug: r.slug,
    kind: r.kind,
    title: r.title,
    dateLabel: r.dateLabel,
    raw: r.content,
    tables: parseTables(r.content),
    version: r.version,
  };
});

useSeoMeta({
  title: () => (record.value ? `${record.value.title} · 市场日记` : "加载中 · 市场日记"),
  description: () => record.value?.dateLabel ?? "",
});
</script>

<template>
  <AppShell v-if="record" module="research" :title="record.title" :subtitle="record.dateLabel">
    <template #actions>
      <NuxtLink class="secondary-link" :to="`/research/${record.kind}`">返回归档</NuxtLink>
      <NuxtLink class="secondary-link" :to="`/research/edit/${record.kind}/${record.slug}`">编辑</NuxtLink>
    </template>

    <article class="report-page report-surface">
      <section class="report-hero">
        <span class="eyebrow">{{ record.kind === "weekly" ? "WEEKLY REVIEW" : "DAILY REVIEW" }} / {{ record.slug }}</span>
        <h1>{{ record.title }}</h1>
        <p>{{ record.dateLabel }}</p>
      </section>
      <MarkdownDocument :markdown="record.raw" />
    </article>
  </AppShell>

  <AppShell v-else-if="pending" module="research" title="加载中">
    <section class="loading-state" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true" />
      <p>正在读取复盘…</p>
    </section>
  </AppShell>

  <AppShell v-else module="research" title="未找到这份复盘">
    <section class="empty-state">
      <p class="eyebrow">MARKET DIARY / 404</p>
      <h1>未找到这份复盘</h1>
      <p>{{ fetchError?.message || "该复盘可能已被删除或编号不正确。" }}</p>
      <NuxtLink to="/" class="secondary-link">返回研究终端</NuxtLink>
    </section>
  </AppShell>
</template>
