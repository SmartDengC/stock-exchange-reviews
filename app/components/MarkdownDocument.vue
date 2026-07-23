<script setup lang="ts">
import { MdPreview } from "md-editor-v3";
import { sanitizeMarkdownHtml } from "~/lib/markdown-sanitize";
import { useTheme } from "~/composables/use-theme";

defineProps<{ markdown: string }>();
const { theme } = useTheme();
</script>

<template>
  <article class="markdown-document">
    <MdPreview
      id="market-diary-markdown"
      :model-value="markdown"
      :theme="theme"
      preview-theme="default"
      code-theme="github"
      :sanitize="sanitizeMarkdownHtml"
      :no-mermaid="true"
    />
  </article>
</template>
