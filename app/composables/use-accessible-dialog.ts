import type { Ref } from "vue";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let lockedDialogs = 0;
let previousBodyOverflow = "";

function lockBackground() {
  if (!import.meta.client) return;
  if (lockedDialogs === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.querySelector<HTMLElement>("#__nuxt")?.setAttribute("inert", "");
  }
  lockedDialogs += 1;
}

function unlockBackground() {
  if (!import.meta.client || lockedDialogs === 0) return;
  lockedDialogs -= 1;
  if (lockedDialogs === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.querySelector<HTMLElement>("#__nuxt")?.removeAttribute("inert");
  }
}

export function useAccessibleDialog(
  open: Ref<boolean>,
  close: () => void,
  initialFocus?: Ref<HTMLElement | null>,
  lockPage = true,
) {
  const dialogRef = ref<HTMLElement | null>(null);
  let returnFocus: HTMLElement | null = null;
  let locked = false;

  function focusInitialControl() {
    const target = initialFocus?.value
      ?? dialogRef.value?.querySelector<HTMLElement>(focusableSelector)
      ?? dialogRef.value;
    target?.focus();
  }

  function onDialogKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.value) return;

    const controls = [...dialogRef.value.querySelectorAll<HTMLElement>(focusableSelector)]
      .filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);
    if (!controls.length) {
      event.preventDefault();
      dialogRef.value.focus();
      return;
    }

    const first = controls[0]!;
    const last = controls.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  watch(open, async (visible) => {
    if (!import.meta.client) return;
    if (visible) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (lockPage && !locked) {
        lockBackground();
        locked = true;
      }
      await nextTick();
      focusInitialControl();
      return;
    }

    if (lockPage && locked) {
      unlockBackground();
      locked = false;
    }
    await nextTick();
    returnFocus?.focus();
    returnFocus = null;
  }, { immediate: true });

  onBeforeUnmount(() => {
    if (locked) unlockBackground();
  });

  return { dialogRef, onDialogKeydown };
}
