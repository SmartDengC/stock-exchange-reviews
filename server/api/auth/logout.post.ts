import { assertSameOrigin } from "../../utils/assert-same-origin";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await clearUserSession(event);
  return { loggedIn: false };
});
