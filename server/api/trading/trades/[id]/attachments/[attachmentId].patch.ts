import { getRouterParam, readBody } from "h3";
import { assertSameOrigin } from "../../../../../utils/assert-same-origin";
import { updateAttachment } from "../../../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  return updateAttachment(
    event,
    getRouterParam(event, "id") ?? "",
    getRouterParam(event, "attachmentId") ?? "",
    await readBody<{ sortOrder?: number; isCover?: boolean }>(event),
  );
});
