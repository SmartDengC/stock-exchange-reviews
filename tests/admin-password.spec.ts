import { describe, expect, it } from "vitest";
import {
  hashAdminPassword,
  verifyAdminPassword,
} from "../server/utils/admin-password";

describe("administrator password hashing", () => {
  it("hashes and verifies a strong password", async () => {
    const hash = await hashAdminPassword("a-secure-password");

    expect(hash).not.toContain("a-secure-password");
    await expect(verifyAdminPassword(hash, "a-secure-password")).resolves.toBe(true);
    await expect(verifyAdminPassword(hash, "wrong-password")).resolves.toBe(false);
  });

  it("rejects short passwords and malformed hashes", async () => {
    await expect(hashAdminPassword("short")).rejects.toThrow("至少需要 12 个字符");
    await expect(verifyAdminPassword("not-a-hash", "anything")).resolves.toBe(false);
  });
});
