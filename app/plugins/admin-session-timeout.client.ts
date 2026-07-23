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

  document.addEventListener("visibilitychange", checkSessionDeadline);
  window.addEventListener("focus", checkSessionDeadline);

  nuxtApp.vueApp.onUnmount(() => {
    stopSessionWatch();
    timer.dispose();
    document.removeEventListener("visibilitychange", checkSessionDeadline);
    window.removeEventListener("focus", checkSessionDeadline);
  });
});
