export type ResearchReview = {
  content: string;
  createdAt: string;
  dateLabel: string;
  id: string;
  kind: 'daily' | 'weekly';
  slug: string;
  title: string;
  updatedAt: string;
  version: number;
};

export type ResearchReviewFilters = {
  dateFrom?: string;
  dateTo?: string;
  kind?: 'daily' | 'weekly';
  q?: string;
};
