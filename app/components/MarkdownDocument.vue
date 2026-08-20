<script setup lang="ts">
import { marked } from "marked";
import { sanitizeMarkdownHtml } from "~/lib/markdown-sanitize";

const props = defineProps<{ markdown: string }>();

const html = computed(() => sanitizeMarkdownHtml(marked.parse(props.markdown, { async: false }) as string));
</script>

<template>
  <article class="markdown-document" v-html="html" />
</template>
