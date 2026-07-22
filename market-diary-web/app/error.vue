<script setup lang="ts">
const props = defineProps<{
  error: { statusCode?: number; statusMessage?: string; message?: string };
}>();

const title = computed(() => props.error.statusCode === 404 ? "未找到这份复盘" : "页面暂时不可用");
const description = computed(() => props.error.statusMessage || props.error.message || "请返回研究终端后重试。");

useSeoMeta({ title: () => `${title.value} · 市场日记` });
</script>

<template>
  <main class="empty-state">
    <p class="eyebrow">MARKET DIARY / {{ error.statusCode || 500 }}</p>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <AButton type="primary" @click="clearError({ redirect: '/' })">返回研究终端</AButton>
  </main>
</template>
