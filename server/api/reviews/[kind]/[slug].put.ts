import { getRouterParams, readBody } from "h3";
import {
  ReviewRepoError,
  upsertResearchReview,
} from "../../../utils/review-repository";

export default defineEventHandler(async (event) => {
  const { kind = "", slug = "" } = getRouterParams(event);
  const body = await readBody(event);

  try {
    return await upsertResearchReview(event, {
      kind: kind as "daily" | "weekly",
      slug,
      title: body.title,
      dateLabel: body.dateLabel,
      content: body.content,
      version: body.version,
    });
  } catch (error) {
    if (error instanceof ReviewRepoError) {
      throw createError({ statusCode: 400, message: error.message });
    }
    throw error;
  }
});
