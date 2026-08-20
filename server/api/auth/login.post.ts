import { createError, readBody } from "h3";
import { assertSameOrigin } from "../../utils/assert-same-origin";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  const body = await readBody<{ username?: unknown; password?: unknown }>(event);
  
  const config = useRuntimeConfig(event);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (username !== config.username || password !== config.password) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    throw createError({ statusCode: 401, message: "账号或密码错误" });
  }

  await setUserSession(
    event,
    { user: { username, role: "user" as const } },
    { maxAge: 60 * 60 * 24 * 365 },
  );
  
  return { loggedIn: true };
});
