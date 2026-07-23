import { describe, expect, it, vi } from "vitest";
import { createAdminSessionTimer } from "~/lib/admin-session-timer";
import {
  ADMIN_SESSION_MAX_AGE_MS,
  isAdminSessionExpired,
  resolveAdminSessionDeadline,
} from "../shared/auth-session";

describe("admin session timeout", () => {
  it("uses the fixed server expiry and falls back to login time for old sessions", () => {
    const loggedInAt = "2026-07-23T08:00:00.000Z";
    const explicitExpiry = "2026-07-23T08:05:30.000Z";

    expect(resolveAdminSessionDeadline({
      loggedInAt,
      expiresAt: explicitExpiry,
    })).toBe(Date.parse(explicitExpiry));
    expect(resolveAdminSessionDeadline({ loggedInAt })).toBe(
      Date.parse(loggedInAt) + ADMIN_SESSION_MAX_AGE_MS,
    );
  });

  it("expires exactly five minutes after login", () => {
    const loggedInAt = "2026-07-23T08:00:00.000Z";
    const deadline = Date.parse(loggedInAt) + ADMIN_SESSION_MAX_AGE_MS;

    expect(isAdminSessionExpired({ loggedInAt }, deadline - 1)).toBe(false);
    expect(isAdminSessionExpired({ loggedInAt }, deadline)).toBe(true);
    expect(isAdminSessionExpired(null, deadline)).toBe(true);
  });

  it("fires once at the deadline and can recheck after a sleeping tab resumes", async () => {
    vi.useFakeTimers();
    const startedAt = Date.now();
    let deadline: number | null = startedAt + ADMIN_SESSION_MAX_AGE_MS;
    const onExpire = vi.fn();
    const timer = createAdminSessionTimer({
      getDeadline: () => deadline,
      onExpire,
    });

    timer.sync();
    await vi.advanceTimersByTimeAsync(ADMIN_SESSION_MAX_AGE_MS - 1);
    expect(onExpire).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onExpire).toHaveBeenCalledOnce();

    deadline = Date.now() - 1;
    timer.sync();
    expect(onExpire).toHaveBeenCalledTimes(2);

    timer.dispose();
    vi.useRealTimers();
  });
});
