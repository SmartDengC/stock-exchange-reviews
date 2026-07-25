export type AttachmentCompletionInput = {
  pathname: string;
  fileName: string;
  width: number | null;
  height: number | null;
};

export class TradingAttachmentValidationError extends Error {}

function optionalDimension(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0 || value > 100_000) {
    throw new TradingAttachmentValidationError(`${label}不合法`);
  }
  return value;
}

export function validateAttachmentCompletion(value: unknown, tradeId: string): AttachmentCompletionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TradingAttachmentValidationError("上传元数据不合法");
  }
  const body = value as Record<string, unknown>;
  if (typeof body.pathname !== "string" || !body.pathname.startsWith(`trades/${tradeId}/`)) {
    throw new TradingAttachmentValidationError("上传目标不合法");
  }
  if (typeof body.fileName !== "string" || !body.fileName.trim() || body.fileName.trim().length > 255) {
    throw new TradingAttachmentValidationError("文件名不合法");
  }
  return {
    pathname: body.pathname,
    fileName: body.fileName.trim(),
    width: optionalDimension(body.width, "图片宽度"),
    height: optionalDimension(body.height, "图片高度"),
  };
}
