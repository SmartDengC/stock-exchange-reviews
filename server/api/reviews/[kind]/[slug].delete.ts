import { getRouterParams } from "h3";
import {
  ReviewRepoError,
  deleteResearchReview,
} from "../../../utils/review-repository";

export default defineEventHandler(async (event) => {
  const { kind = "", slug = "" } = getRouterParams(event);

  try {
    const deleted = await deleteResearchReview(event, kind, slug);
    if (!deleted) {
      throw createError({ statusCode: 404, message: "未找到这份复盘" });
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof ReviewRepoError) {
      throw createError({ statusCode: 400, message: error.message });
    }
    throw error;
  }
});
