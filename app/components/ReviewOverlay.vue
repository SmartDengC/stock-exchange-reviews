<script setup lang="ts">
import type { ReviewRecord } from "~/lib/reviews";
import { useAccessibleDialog } from "~/composables/use-accessible-dialog";

const props = defineProps<{ review: ReviewRecord | null }>();
const emit = defineEmits<{ close: [] }>();

const closeButton = ref<HTMLElement | null>(null);
const visible = computed(() => Boolean(props.review));

function close() {
  emit("close");
}

const { dialogRef, onDialogKeydown } = useAccessibleDialog(visible, close, closeButton);
</script>

<template>
  <Teleport to="body">
    <Transition name="review-overlay">
      <div v-if="review" class="review-overlay-backdrop">
        <button type="button" class="review-overlay-dismiss" aria-label="关闭报告" @click="close" />
        <section
          ref="dialogRef"
          class="review-overlay-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-overlay-title"
          tabindex="-1"
          @keydown="onDialogKeydown"
        >
          <header class="review-overlay-header">
            <div>
              <span class="eyebrow">{{ review.kind === "weekly" ? "WEEKLY REVIEW" : "DAILY REVIEW" }} / {{ review.slug }}</span>
              <h2 id="review-overlay-title">{{ review.title }}</h2>
              <p>{{ review.dateLabel }}</p>
            </div>
            <button ref="closeButton" type="button" class="review-overlay-close" aria-label="关闭报告" @click="close">
              收起 <span aria-hidden="true">×</span>
            </button>
          </header>

          <div class="review-overlay-body">
            <MarkdownDocument :markdown="review.raw" />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
