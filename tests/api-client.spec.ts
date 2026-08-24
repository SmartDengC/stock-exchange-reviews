import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

describe("Trading Cloud API client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("defineNuxtPlugin", (setup: unknown) => setup);
  });

  it("normalizes the base URL, includes credentials, and forwards SSR cookies", async () => {
    const { apiClientDefaults } = await import("~/plugins/api");

    expect(apiClientDefaults("https://api.example.com/", "trading_session=token")).toEqual({
      baseURL: "https://api.example.com",
      credentials: "include",
      headers: { cookie: "trading_session=token" },
    });
    expect(apiClientDefaults("http://localhost:8000").headers).toBeUndefined();
  });

  it("clears local state and redirects protected requests after a 401", async () => {
    const user = ref({ username: "admin", role: "user" as const });
    const navigateTo = vi.fn();
    vi.stubGlobal("useState", () => user);
    vi.stubGlobal("navigateTo", navigateTo);
    window.history.replaceState({}, "", "/trading/trades");
    const { handleUnauthorized } = await import("~/plugins/api");

    await handleUnauthorized("/api/trading/trades", true);

    expect(user.value).toBeNull();
    expect(navigateTo).toHaveBeenCalledWith({
      path: "/login",
      query: { returnTo: "/trading/trades" },
    });
  });

  it("does not redirect when the session probe itself returns 401", async () => {
    const navigateTo = vi.fn();
    vi.stubGlobal("useState", () => ref(null));
    vi.stubGlobal("navigateTo", navigateTo);
    const { handleUnauthorized } = await import("~/plugins/api");

    await handleUnauthorized("/api/auth/session", true);

    expect(navigateTo).not.toHaveBeenCalled();
  });
});
