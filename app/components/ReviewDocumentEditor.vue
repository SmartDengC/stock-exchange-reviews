<script setup lang="ts">
import type { ReviewRecord } from "~/lib/reviews";
import { MarkdownDocument } from "#components";

const props = defineProps<{ review: ReviewRecord }>();
</script>

<template>
  <MarkdownDocument :markdown="review.raw" />
</template>
