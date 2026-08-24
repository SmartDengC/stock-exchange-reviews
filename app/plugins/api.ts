import type { SessionUser } from "~~/shared/types/auth";

export function apiClientDefaults(baseURL: string, cookie?: string | null) {
  return {
    baseURL: baseURL.replace(/\/$/, ""),
    credentials: "include" as const,
    headers: cookie ? { cookie } : undefined,
  };
}

export async function handleUnauthorized(request: unknown, client = import.meta.client) {
  const user = useState<SessionUser | null>("trading-cloud-user", () => null);
  user.value = null;
  const requestPath = String(request);
  if (
    client
    && !requestPath.includes("/api/auth/session")
    && !window.location.pathname.startsWith("/login")
    && !window.location.pathname.startsWith("/trading/login")
  ) {
    await navigateTo({ path: "/login", query: { returnTo: window.location.pathname } });
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const cookie = import.meta.server ? useRequestHeader("cookie") : undefined;

  const api = $fetch.create({
    ...apiClientDefaults(config.public.tradingApiBase, cookie),
    async onResponseError({ request, response }) {
      if (response.status !== 401) return;
      await handleUnauthorized(request);
    },
  });

  return { provide: { api } };
});
