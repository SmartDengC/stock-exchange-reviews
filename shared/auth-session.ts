export const ADMIN_SESSION_MAX_AGE_SECONDS = 5 * 60;
export const ADMIN_SESSION_MAX_AGE_MS = ADMIN_SESSION_MAX_AGE_SECONDS * 1000;

export type AdminSessionTimestamps = {
  expiresAt?: unknown;
  loggedInAt?: unknown;
};

function parseTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function resolveAdminSessionDeadline(session: AdminSessionTimestamps | null) {
  if (!session) return null;

  const explicitDeadline = parseTimestamp(session.expiresAt);
  if (explicitDeadline !== null) return explicitDeadline;

  const loggedInAt = parseTimestamp(session.loggedInAt);
  return loggedInAt === null ? null : loggedInAt + ADMIN_SESSION_MAX_AGE_MS;
}

export function isAdminSessionExpired(
  session: AdminSessionTimestamps | null,
  now = Date.now(),
) {
  const deadline = resolveAdminSessionDeadline(session);
  return deadline === null || now >= deadline;
}
