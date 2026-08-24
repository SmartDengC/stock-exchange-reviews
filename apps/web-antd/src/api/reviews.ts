import type { ResearchReview, ResearchReviewFilters } from '#/types/research';

import { requestClient } from './request';

function listResearchReviews(filters: ResearchReviewFilters = {}) {
  return requestClient.get<ResearchReview[]>('/api/reviews', {
    params: filters,
  });
}

function getResearchReview(kind: string, slug: string) {
  return requestClient.get<ResearchReview>(`/api/reviews/${kind}/${slug}`);
}

function saveResearchReview(
  kind: string,
  slug: string,
  data: {
    content: string;
    dateLabel: string;
    title: string;
    version?: number;
  },
) {
  return requestClient.put<ResearchReview>(
    `/api/reviews/${kind}/${slug}`,
    data,
  );
}

function deleteResearchReview(kind: string, slug: string) {
  return requestClient.delete<{ ok: boolean }>(
    `/api/reviews/${kind}/${slug}`,
  );
}

export {
  deleteResearchReview,
  getResearchReview,
  listResearchReviews,
  saveResearchReview,
};
