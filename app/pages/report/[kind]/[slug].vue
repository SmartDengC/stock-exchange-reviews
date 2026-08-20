<script setup lang="ts">
import { parseTables } from "~/lib/reviews";

const route = useRoute();
const kind = Array.isArray(route.params.kind) ? route.params.kind[0] : route.params.kind;
const slug = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug;

const { data: apiReview, error: fetchError } = await useFetch<ResearchReview>(
  `/api/reviews/${kind}/${slug}`,
);

if (fetchError.value || !apiReview.value) {
  throw createError({ statusCode: 404, statusMessage: "未找到这份复盘" });
}

const record = computed(() => {
  const r = apiReview.value!;
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
  title: () => `${record.value.title} · 市场日记`,
  description: () => record.value.dateLabel,
});
</script>

<template>
  <AppShell module="research" :title="record.title" :subtitle="record.dateLabel">
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
</template>
