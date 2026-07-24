import { get } from "@vercel/blob";
import { getRouterParam, sendStream, setResponseHeader, setResponseStatus } from "h3";
import { requireActiveAdminSession } from "../../../utils/review-api";
import { getAttachment } from "../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  await requireActiveAdminSession(event);
  const attachment = await getAttachment(event, getRouterParam(event, "attachmentId") ?? "");
  if (!attachment) throw createError({ statusCode: 404, message: "未找到截图" });
  const token = useRuntimeConfig(event).blobReadWriteToken || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw createError({ statusCode: 503, message: "私有图片存储尚未配置" });
  const result = await get(attachment.pathname, { access: "private", token });
  if (!result || result.statusCode !== 200) {
    setResponseStatus(event, 404);
    return "Not found";
  }
  setResponseHeader(event, "Content-Type", attachment.contentType);
  setResponseHeader(event, "Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`);
  setResponseHeader(event, "Cache-Control", "private, no-store");
  setResponseHeader(event, "X-Content-Type-Options", "nosniff");
  return sendStream(event, result.stream);
});
