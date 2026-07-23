import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getRequestURL, getRouterParam, readBody } from "h3";
import { assertSameOrigin, requireActiveAdminSession } from "../../../../../utils/review-api";
import { getTrade, insertAttachment } from "../../../../../utils/trading-repository";

type UploadPayload = {
  tradeId: string;
  fileName: string;
  size?: number;
  width?: number | null;
  height?: number | null;
};

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  const routeTradeId = getRouterParam(event, "id") ?? "";
  const body = await readBody<HandleUploadBody>(event);
  const request = toWebRequest(event);
  const token = useRuntimeConfig(event).blobReadWriteToken || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw createError({ statusCode: 503, message: "私有图片存储尚未配置" });

  return handleUpload({
    body,
    request,
    token,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      await requireActiveAdminSession(event);
      const trade = await getTrade(event, routeTradeId);
      if (!trade) throw new Error("交易记录不存在");
      if (trade.attachments.length >= 10) throw new Error("每笔交易最多上传 10 张截图");
      const payload = JSON.parse(clientPayload ?? "{}") as Partial<UploadPayload>;
      if (payload.tradeId !== routeTradeId) throw new Error("上传目标不合法");
      return {
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        maximumSizeInBytes: 15 * 1024 * 1024,
        addRandomSuffix: true,
        callbackUrl: `${getRequestURL(event).origin}/api/trading/trades/${routeTradeId}/attachments`,
        tokenPayload: JSON.stringify({
          tradeId: routeTradeId,
          fileName: payload.fileName || pathname.split("/").pop() || "trade-image",
          size: typeof payload.size === "number" ? payload.size : 0,
          width: payload.width ?? null,
          height: payload.height ?? null,
        } satisfies UploadPayload),
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      const payload = JSON.parse(tokenPayload ?? "{}") as Partial<UploadPayload>;
      if (!payload.tradeId || !payload.fileName) {
        throw new Error("上传元数据不完整");
      }
      await insertAttachment(event, {
        tradeId: payload.tradeId,
        pathname: blob.pathname,
        blobUrl: blob.url,
        fileName: payload.fileName,
        contentType: blob.contentType,
        size: payload.size ?? 0,
        width: payload.width,
        height: payload.height,
      });
    },
  });
});
