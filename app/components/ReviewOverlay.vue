<script setup lang="ts">
import type { ReviewRecord } from "~/lib/reviews";

const props = defineProps<{ review: ReviewRecord | null }>();
const emit = defineEmits<{ close: [] }>();

const closeButton = ref<HTMLButtonElement | null>(null);
const documentEditor = ref<{ confirmDiscard: () => boolean } | null>(null);
let bodyOverflow = "";
let returnFocus: HTMLElement | null = null;
let scrollLocked = false;

function close() {
  if (documentEditor.value && !documentEditor.value.confirmDiscard()) return;
  emit("close");
}

function lockPageScroll() {
  if (!import.meta.client || scrollLocked) return;
  bodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  scrollLocked = true;
}

function unlockPageScroll() {
  if (!import.meta.client || !scrollLocked) return;
  document.body.style.overflow = bodyOverflow;
  scrollLocked = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.review) close();
}

watch(() => Boolean(props.review), async (visible) => {
  if (!import.meta.client) return;

  if (visible) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockPageScroll();
    await nextTick();
    closeButton.value?.focus();
    return;
  }

  unlockPageScroll();
  await nextTick();
  returnFocus?.focus();
  returnFocus = null;
});

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  unlockPageScroll();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="review-overlay">
      <div v-if="review" class="review-overlay-backdrop" @click.self="close">
        <section
          class="review-overlay-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-overlay-title"
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
            <ReviewDocumentEditor ref="documentEditor" :review="review" />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
