import { createError, readBody } from "h3";
import { ADMIN_SESSION_MAX_AGE_SECONDS } from "../../../shared/auth-session";
import { assertSameOrigin } from "../../utils/review-api";
import { verifyAdminPassword } from "../../utils/admin-password";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  const body = await readBody<{ password?: unknown }>(event);
  const password = typeof body?.password === "string" ? body.password : "";
  const passwordHash = useRuntimeConfig(event).adminPasswordHash;

  if (!passwordHash) {
    throw createError({
      statusCode: 503,
      message: "管理员密码尚未配置",
    });
  }
  if (!password || !(await verifyAdminPassword(passwordHash, password))) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    throw createError({ statusCode: 401, message: "管理员密码错误" });
  }

  const loggedInAt = new Date();
  await setUserSession(
    event,
    {
      user: { name: "管理员", role: "admin" },
      loggedInAt: loggedInAt.toISOString(),
      expiresAt: new Date(
        loggedInAt.getTime() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
      ).toISOString(),
    },
    { maxAge: ADMIN_SESSION_MAX_AGE_SECONDS },
  );
  return { loggedIn: true };
});
