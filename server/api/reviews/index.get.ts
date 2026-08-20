import { getQuery } from "h3";
import type { ResearchReviewFilters } from "../../utils/review-repository";
import { listResearchReviews } from "../../utils/review-repository";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const kind = typeof query.kind === "string" ? query.kind : undefined;

  if (kind && kind !== "daily" && kind !== "weekly") {
    throw createError({ statusCode: 400, message: "kind 必须是 daily 或 weekly" });
  }

  const filters: ResearchReviewFilters = {
    kind: kind as "daily" | "weekly" | undefined,
    dateFrom: typeof query.dateFrom === "string" ? query.dateFrom : undefined,
    dateTo: typeof query.dateTo === "string" ? query.dateTo : undefined,
    q: typeof query.q === "string" ? query.q : undefined,
  };

  return await listResearchReviews(event, filters);
});
