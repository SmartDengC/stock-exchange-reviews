import { useState } from "#imports";

export function useAdminSessionTimeout() {
  return useState<boolean>("admin-session-timed-out", () => false);
}
