import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getRouterParam, readBody } from "h3";
import { assertSameOrigin } from "../../../../../utils/assert-same-origin";
import { getTrade } from "../../../../../utils/trading-repository";

type UploadPayload = {
  tradeId: string;
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
      const trade = await getTrade(event, routeTradeId);
      if (!trade) throw new Error("交易记录不存在");
      if (trade.attachments.length >= 10) throw new Error("每笔交易最多上传 10 张截图");
      const payload = JSON.parse(clientPayload ?? "{}") as Partial<UploadPayload>;
      if (payload.tradeId !== routeTradeId || !pathname.startsWith(`trades/${routeTradeId}/`)) {
        throw new Error("上传目标不合法");
      }
      return {
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        maximumSizeInBytes: 15 * 1024 * 1024,
        addRandomSuffix: true,
      };
    },
  });
});
