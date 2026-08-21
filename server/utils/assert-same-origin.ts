import type { H3Event } from "h3";
import { createError, getRequestHeader, getRequestURL } from "h3";

export function assertSameOrigin(event: H3Event) {
  const origin = getRequestHeader(event, "origin");
  // 如果没有 Origin 头（Safari 某些情况），允许请求
  if (!origin) return;
  
  const requestURL = getRequestURL(event);
  const serverOrigin = requestURL.origin;
  
  // 检查 Origin 头是否与服务器 URL 匹配
  if (origin !== serverOrigin) {
    throw createError({ statusCode: 403, message: "拒绝跨站请求" });
  }
}
