import { getRouterParams } from "h3";
import { getResearchReview } from "../../../utils/review-repository";

export default defineEventHandler(async (event) => {
  const { kind = "", slug = "" } = getRouterParams(event);
  const review = await getResearchReview(event, kind, slug);

  if (!review) {
    throw createError({ statusCode: 404, message: "未找到这份复盘" });
  }

  return review;
});
