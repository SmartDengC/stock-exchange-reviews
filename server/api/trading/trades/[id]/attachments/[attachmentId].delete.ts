import { del } from "@vercel/blob";
import { getRouterParam } from "h3";
import { assertSameOrigin, requireActiveAdminSession } from "../../../../../utils/review-api";
import { deleteAttachmentRecord } from "../../../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await requireActiveAdminSession(event);
  const row = await deleteAttachmentRecord(
    event,
    getRouterParam(event, "id") ?? "",
    getRouterParam(event, "attachmentId") ?? "",
  );
  const token = useRuntimeConfig(event).blobReadWriteToken || process.env.BLOB_READ_WRITE_TOKEN;
  if (token) await del(row.pathname, { token }).catch(() => undefined);
  return { deleted: true };
});
