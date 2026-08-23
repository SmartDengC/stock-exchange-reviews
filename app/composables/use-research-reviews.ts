import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";

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

export function useResearchReviewList(filters: MaybeRefOrGetter<ResearchReviewFilters> = {}) {
  const query = computed(() => {
    const resolved = toValue(filters);
    const params: Record<string, string> = {};
    if (resolved.kind) params.kind = resolved.kind;
    if (resolved.dateFrom) params.dateFrom = resolved.dateFrom;
    if (resolved.dateTo) params.dateTo = resolved.dateTo;
    if (resolved.q) params.q = resolved.q;
    return params;
  });

  return useFetch<ResearchReview[]>("/api/reviews", {
    query,
    watch: [query],
    lazy: true,
    server: false,
  });
}

export function useResearchReview(kind: string, slug: string) {
  return useFetch<ResearchReview>(`/api/reviews/${kind}/${slug}`, {
    lazy: true,
    server: false,
  });
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
