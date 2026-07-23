import { getRouterParams } from "h3";
import {
  getRepositoryConfig,
  requireActiveAdminSession,
  throwReviewApiError,
} from "../../../utils/review-api";
import { readGitHubReview, resolveReviewPath } from "../../../utils/review-storage";

export default defineEventHandler(async (event) => {
  await requireActiveAdminSession(event);
  const { kind = "", slug = "" } = getRouterParams(event);

  try {
    const path = resolveReviewPath(kind, slug);
    return await readGitHubReview(getRepositoryConfig(event), path);
  } catch (error) {
    throwReviewApiError(error);
  }
});
