import type { H3Event } from "h3";
import { createError, getRequestHeader, getRequestURL } from "h3";

export function assertSameOrigin(event: H3Event) {
  const origin = getRequestHeader(event, "origin");
  if (origin && origin !== getRequestURL(event).origin) {
    throw createError({ statusCode: 403, message: "拒绝跨站请求" });
  }
}
