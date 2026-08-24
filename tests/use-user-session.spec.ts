import { computed, ref, type Ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUserSession } from "~/composables/use-user-session";

const states = new Map<string, Ref<unknown>>();
const api = vi.fn();

describe("useUserSession", () => {
  beforeEach(() => {
    states.clear();
    api.mockReset();
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("useState", <T>(key: string, init: () => T) => {
      if (!states.has(key)) states.set(key, ref(init()));
      return states.get(key) as Ref<T>;
    });
    vi.stubGlobal("useNuxtApp", () => ({ $api: api }));
  });

  it("refreshes an authenticated session", async () => {
    api.mockResolvedValue({ loggedIn: true, user: { username: "admin", role: "user" } });
    const session = useUserSession();

    await session.fetch();

    expect(session.ready.value).toBe(true);
    expect(session.loggedIn.value).toBe(true);
    expect(session.user.value?.username).toBe("admin");
  });

  it("treats a 401 session probe as logged out", async () => {
    api.mockRejectedValue({ response: { status: 401 } });
    const session = useUserSession();

    await expect(session.fetch()).resolves.toEqual({ loggedIn: false, user: null });
    expect(session.loggedIn.value).toBe(false);
    expect(session.ready.value).toBe(true);
  });

  it("revokes the backend session before clearing local state", async () => {
    api.mockResolvedValueOnce({ loggedIn: true, user: { username: "admin", role: "user" } });
    const session = useUserSession();
    await session.fetch();
    api.mockResolvedValueOnce({ loggedIn: false });

    await session.clear();

    expect(api).toHaveBeenLastCalledWith("/api/auth/logout", { method: "POST" });
    expect(session.loggedIn.value).toBe(false);
  });
});
