<script setup lang="ts">
import { parseInline } from "~/lib/markdown";

const props = defineProps<{ text: string }>();
const tokens = computed(() => parseInline(props.text));
</script>

<template>
  <template v-for="(token, index) in tokens" :key="index">
    <strong v-if="token.kind === 'strong'">{{ token.text }}</strong>
    <code v-else-if="token.kind === 'code'">{{ token.text }}</code>
    <a
      v-else-if="token.kind === 'link'"
      class="markdown-link"
      :href="token.href"
      target="_blank"
      rel="noopener noreferrer"
    >{{ token.text }}</a>
    <template v-else>{{ token.text }}</template>
  </template>
</template>
