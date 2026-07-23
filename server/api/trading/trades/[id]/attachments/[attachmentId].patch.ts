import { getRouterParam, readBody } from "h3";
import { assertSameOrigin, requireActiveAdminSession } from "../../../../../utils/review-api";
import { updateAttachment } from "../../../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await requireActiveAdminSession(event);
  return updateAttachment(
    event,
    getRouterParam(event, "id") ?? "",
    getRouterParam(event, "attachmentId") ?? "",
    await readBody<{ sortOrder?: number; isCover?: boolean }>(event),
  );
});
