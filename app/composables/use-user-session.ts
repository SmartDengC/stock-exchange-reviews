import type { SessionResponse, SessionUser } from "~~/shared/types/auth";

function statusCode(error: unknown) {
  return (error as { response?: { status?: number }; statusCode?: number })?.response?.status
    ?? (error as { statusCode?: number })?.statusCode;
}

export function useUserSession() {
  const user = useState<SessionUser | null>("trading-cloud-user", () => null);
  const ready = useState("trading-cloud-session-ready", () => false);
  const { $api } = useNuxtApp();

  async function fetch() {
    try {
      const response = await $api<SessionResponse>("/api/auth/session");
      user.value = response.loggedIn ? response.user : null;
      return response;
    } catch (error) {
      user.value = null;
      if (statusCode(error) === 401) return { loggedIn: false, user: null } satisfies SessionResponse;
      throw error;
    } finally {
      ready.value = true;
    }
  }

  async function clear() {
    try {
      await $api("/api/auth/logout", { method: "POST" });
    } finally {
      user.value = null;
      ready.value = true;
    }
  }

  return {
    ready,
    loggedIn: computed(() => Boolean(user.value)),
    user: computed(() => user.value),
    session: computed(() => user.value ? { user: user.value } : null),
    fetch,
    clear,
  };
}
