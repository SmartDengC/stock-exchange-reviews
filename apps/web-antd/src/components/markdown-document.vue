<script lang="ts" setup>
import { computed } from 'vue';

import { marked } from 'marked';

import { sanitizeMarkdownHtml } from '#/lib/markdown-sanitize';

const props = defineProps<{ markdown: string }>();
const html = computed(() =>
  sanitizeMarkdownHtml(
    marked.parse(props.markdown || '', { async: false }) as string,
  ),
);
</script>

<template>
  <!-- HTML is sanitized with a strict allowlist before rendering. -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <article class="markdown-document" v-html="html"></article>
</template>
