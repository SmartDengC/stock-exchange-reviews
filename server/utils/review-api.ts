import type { H3Event } from "h3";
import { createError, getRequestHeader, getRequestURL } from "h3";
import { isAdminSessionExpired } from "../../shared/auth-session";
import {
  GitHubApiError,
  ReviewValidationError,
  type GitHubRepositoryConfig,
} from "./review-storage";

export function assertSameOrigin(event: H3Event) {
  const origin = getRequestHeader(event, "origin");
  if (origin && origin !== getRequestURL(event).origin) {
    throw createError({ statusCode: 403, message: "拒绝跨站请求" });
  }
}

export function getRepositoryConfig(event: H3Event): GitHubRepositoryConfig {
  const config = useRuntimeConfig(event);
  const repository = {
    branch: config.githubBranch,
    owner: config.githubOwner,
    repo: config.githubRepo,
    token: config.githubToken,
  };

  if (!repository.owner || !repository.repo || !repository.branch || !repository.token) {
    throw createError({
      statusCode: 503,
      message: "在线编辑服务尚未配置完成",
    });
  }
  return repository;
}

export async function requireActiveAdminSession(event: H3Event) {
  const session = await requireUserSession(event, {
    message: "请先登录管理员账户",
  });
  if (!isAdminSessionExpired(session)) return session;

  await clearUserSession(event);
  throw createError({
    statusCode: 401,
    message: "登录已超时，请重新登录",
  });
}

export function throwReviewApiError(error: unknown): never {
  if (error instanceof ReviewValidationError) {
    throw createError({ statusCode: 400, message: error.message });
  }
  if (error instanceof GitHubApiError) {
    if (error.status === 404) {
      throw createError({ statusCode: 404, message: "未找到这份复盘" });
    }
    if (error.status === 409 || error.status === 422) {
      throw createError({
        statusCode: 409,
        message: "文件已经被其他提交更新，请重新加载后再编辑",
      });
    }
    if (error.status === 401 || error.status === 403) {
      throw createError({
        statusCode: 403,
        message: error.message,
      });
    }
    throw createError({
      statusCode: 502,
      message: `GitHub 保存服务异常：${error.message}`,
    });
  }
  throw error;
}
