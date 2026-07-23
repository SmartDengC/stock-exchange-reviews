import { getRouterParams } from "h3";
import { getRepositoryConfig, throwReviewApiError } from "../../../utils/review-api";
import { readGitHubReview, resolveReviewPath } from "../../../utils/review-storage";

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { message: "请先登录管理员账户" });
  const { kind = "", slug = "" } = getRouterParams(event);

  try {
    const path = resolveReviewPath(kind, slug);
    return await readGitHubReview(getRepositoryConfig(event), path);
  } catch (error) {
    throwReviewApiError(error);
  }
});
