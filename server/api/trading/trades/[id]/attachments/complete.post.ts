import { head } from "@vercel/blob";
import { getRouterParam, readBody } from "h3";
import { assertSameOrigin, requireActiveAdminSession } from "../../../../../utils/review-api";
import {
  TradingAttachmentValidationError,
  validateAttachmentCompletion,
} from "../../../../../utils/trading-attachments";
import { getTrade, insertAttachment } from "../../../../../utils/trading-repository";

const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumSizeInBytes = 15 * 1024 * 1024;

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await requireActiveAdminSession(event);
  const tradeId = getRouterParam(event, "id") ?? "";
  const trade = await getTrade(event, tradeId);
  if (!trade) throw createError({ statusCode: 404, message: "交易记录不存在" });

  let input;
  try {
    input = validateAttachmentCompletion(await readBody(event), tradeId);
  } catch (error) {
    if (error instanceof TradingAttachmentValidationError) {
      throw createError({ statusCode: 400, message: error.message });
    }
    throw error;
  }

  const token = useRuntimeConfig(event).blobReadWriteToken || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw createError({ statusCode: 503, message: "私有图片存储尚未配置" });
  const blob = await head(input.pathname, { token });
  if (!allowedContentTypes.has(blob.contentType) || blob.size > maximumSizeInBytes) {
    throw createError({ statusCode: 400, message: "截图类型或大小不合法" });
  }

  return insertAttachment(event, {
    tradeId,
    pathname: blob.pathname,
    blobUrl: blob.url,
    fileName: input.fileName,
    contentType: blob.contentType,
    size: blob.size,
    width: input.width,
    height: input.height,
  });
});
