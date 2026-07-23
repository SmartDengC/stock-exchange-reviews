import { useUserSession } from "#imports";
import { watch } from "vue";
import { useAdminSessionTimeout } from "~/composables/use-admin-session-timeout";
import { createAdminSessionTimer } from "~/lib/admin-session-timer";
import { resolveAdminSessionDeadline } from "../../shared/auth-session";

export default defineNuxtPlugin((nuxtApp) => {
  const {
    fetch: refreshSession,
    loggedIn,
    session,
  } = useUserSession();
  const timedOut = useAdminSessionTimeout();
  let lastInteractionAt = Date.now();
  let refreshing = false;

  const timer = createAdminSessionTimer({
    getDeadline: () => loggedIn.value
      ? resolveAdminSessionDeadline(session.value)
      : null,
    async onExpire() {
      if (!loggedIn.value) return;
      timedOut.value = true;
      await $fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      await refreshSession().catch(() => {
        session.value = null;
      });
    },
  });

  const stopSessionWatch = watch(
    [
      loggedIn,
      () => session.value?.expiresAt,
      () => session.value?.loggedInAt,
    ],
    ([isLoggedIn], previousValues) => {
      const wasLoggedIn = previousValues?.[0];
      if (isLoggedIn && !wasLoggedIn) timedOut.value = false;
      timer.sync();
    },
    { immediate: true },
  );

  function checkSessionDeadline() {
    if (document.visibilityState === "visible") timer.sync();
  }

  function recordInteraction() {
    lastInteractionAt = Date.now();
  }

  const heartbeat = window.setInterval(async () => {
    if (
      refreshing
      || !loggedIn.value
      || document.visibilityState !== "visible"
      || Date.now() - lastInteractionAt > 5 * 60_000
    ) return;
    refreshing = true;
    try {
      await $fetch("/api/auth/refresh", { method: "POST" });
      await refreshSession();
      timer.sync();
    } catch {
      timer.sync();
    } finally {
      refreshing = false;
    }
  }, 5 * 60_000);

  document.addEventListener("visibilitychange", checkSessionDeadline);
  window.addEventListener("focus", checkSessionDeadline);
  for (const event of ["pointerdown", "keydown", "input", "touchstart"]) {
    window.addEventListener(event, recordInteraction, { passive: true });
  }

  nuxtApp.vueApp.onUnmount(() => {
    stopSessionWatch();
    timer.dispose();
    window.clearInterval(heartbeat);
    document.removeEventListener("visibilitychange", checkSessionDeadline);
    window.removeEventListener("focus", checkSessionDeadline);
    for (const event of ["pointerdown", "keydown", "input", "touchstart"]) {
      window.removeEventListener(event, recordInteraction);
    }
  });
});
