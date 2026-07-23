import { assertSameOrigin, requireActiveAdminSession } from "../../utils/review-api";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await requireActiveAdminSession(event);
  return { refreshed: true };
});
