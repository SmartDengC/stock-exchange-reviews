import { getRouterParams, readBody } from "h3";
import {
  assertSameOrigin,
  getRepositoryConfig,
  requireActiveAdminSession,
  throwReviewApiError,
} from "../../../utils/review-api";
import {
  resolveReviewPath,
  validateReviewContent,
  writeGitHubReview,
} from "../../../utils/review-storage";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await requireActiveAdminSession(event);
  const { kind = "", slug = "" } = getRouterParams(event);
  const body = await readBody<{ content?: unknown; sha?: unknown }>(event);

  try {
    const path = resolveReviewPath(kind, slug);
    validateReviewContent(body?.content);
    const sha = typeof body?.sha === "string" ? body.sha : "";
    return await writeGitHubReview(
      getRepositoryConfig(event),
      path,
      body.content,
      sha,
      slug,
    );
  } catch (error) {
    throwReviewApiError(error);
  }
});
