import { assertSameOrigin } from "../../utils/review-api";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await clearUserSession(event);
  return { loggedIn: false };
});
