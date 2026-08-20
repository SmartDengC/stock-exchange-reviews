export type ResearchReview = {
  id: string;
  kind: "daily" | "weekly";
  slug: string;
  title: string;
  dateLabel: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ResearchReviewFilters = {
  kind?: "daily" | "weekly";
  dateFrom?: string;
  dateTo?: string;
  q?: string;
};

export function toReviewRecord(r: ResearchReview) {
  return { slug: r.slug, kind: r.kind, title: r.title, dateLabel: r.dateLabel, raw: r.content, tables: [] };
}

export function useResearchReviewList(filters: ResearchReviewFilters = {}) {
  const query = computed(() => {
    const params: Record<string, string> = {};
    if (filters.kind) params.kind = filters.kind;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.q) params.q = filters.q;
    return params;
  });

  return useFetch<ResearchReview[]>("/api/reviews", {
    query,
    watch: [query],
  });
}

export function useResearchReview(kind: string, slug: string) {
  return useFetch<ResearchReview>(`/api/reviews/${kind}/${slug}`);
}

export async function saveResearchReview(
  kind: string,
  slug: string,
  data: { title: string; dateLabel: string; content: string; version?: number },
) {
  return await $fetch<ResearchReview>(`/api/reviews/${kind}/${slug}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteResearchReview(kind: string, slug: string) {
  return await $fetch<{ ok: boolean }>(`/api/reviews/${kind}/${slug}`, {
    method: "DELETE",
  });
}
