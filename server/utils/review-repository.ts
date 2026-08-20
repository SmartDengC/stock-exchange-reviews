import type { H3Event } from "h3";
import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { researchReviews } from "../../db/schema";
import { getTradingDb } from "./trading-db";

type ResearchReviewRow = typeof researchReviews.$inferSelect;

export type ResearchReviewView = {
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

export type ResearchReviewInput = {
  kind: "daily" | "weekly";
  slug: string;
  title: string;
  dateLabel: string;
  content: string;
  version?: number;
};

const SLUG_PATTERNS: Record<string, RegExp> = {
  daily: /^\d{4}-\d{2}-\d{2}$/,
  weekly: /^\d{4}-W\d{2}$/,
};

export function validateReviewSlug(kind: string, slug: string): void {
  const pattern = SLUG_PATTERNS[kind];
  if (!pattern || !pattern.test(slug)) {
    throw new ReviewRepoError("复盘类型或编号不合法");
  }
}

export class ReviewRepoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewRepoError";
  }
}

function toView(row: ResearchReviewRow): ResearchReviewView {
  return {
    id: row.id,
    kind: row.kind as "daily" | "weekly",
    slug: row.slug,
    title: row.title,
    dateLabel: row.dateLabel,
    content: row.content,
    version: row.version,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listResearchReviews(
  event: H3Event,
  filters: ResearchReviewFilters = {},
): Promise<ResearchReviewView[]> {
  const db = getTradingDb(event);
  const conditions = [isNull(researchReviews.deletedAt)];

  if (filters.kind) {
    conditions.push(eq(researchReviews.kind, filters.kind));
  }
  if (filters.dateFrom) {
    conditions.push(gte(researchReviews.dateLabel, filters.dateFrom));
  }
  if (filters.dateTo) {
    conditions.push(lte(researchReviews.dateLabel, filters.dateTo));
  }
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(researchReviews.title, pattern),
        ilike(researchReviews.content, pattern),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(researchReviews)
    .where(and(...conditions))
    .orderBy(desc(researchReviews.dateLabel));

  return rows.map(toView);
}

export async function getResearchReview(
  event: H3Event,
  kind: string,
  slug: string,
): Promise<ResearchReviewView | null> {
  const db = getTradingDb(event);
  const [row] = await db
    .select()
    .from(researchReviews)
    .where(
      and(
        eq(researchReviews.kind, kind),
        eq(researchReviews.slug, slug),
        isNull(researchReviews.deletedAt),
      ),
    )
    .limit(1);

  return row ? toView(row) : null;
}

export async function upsertResearchReview(
  event: H3Event,
  input: ResearchReviewInput,
): Promise<ResearchReviewView> {
  validateReviewSlug(input.kind, input.slug);

  if (!input.title.trim()) throw new ReviewRepoError("标题不能为空");
  if (!input.content.trim()) throw new ReviewRepoError("Markdown 内容不能为空");
  if (Buffer.byteLength(input.content, "utf8") > 2 * 1024 * 1024) {
    throw new ReviewRepoError("Markdown 内容不能超过 2 MB");
  }

  const db = getTradingDb(event);
  const now = new Date();

  const existing = await db
    .select({ id: researchReviews.id, version: researchReviews.version })
    .from(researchReviews)
    .where(
      and(
        eq(researchReviews.kind, input.kind),
        eq(researchReviews.slug, input.slug),
        isNull(researchReviews.deletedAt),
      ),
    )
    .limit(1);

  if (existing.length && input.version != null) {
    if (existing[0].version !== input.version) {
      throw new ReviewRepoError("版本冲突，请重新加载后再编辑");
    }
  }

  if (existing.length) {
    const [row] = await db
      .update(researchReviews)
      .set({
        title: input.title,
        dateLabel: input.dateLabel,
        content: input.content,
        version: sql`${researchReviews.version} + 1`,
        updatedAt: now,
      })
      .where(eq(researchReviews.id, existing[0].id))
      .returning();

    return toView(row);
  }

  const [row] = await db
    .insert(researchReviews)
    .values({
      kind: input.kind,
      slug: input.slug,
      title: input.title,
      dateLabel: input.dateLabel,
      content: input.content,
    })
    .returning();

  return toView(row);
}

export async function deleteResearchReview(
  event: H3Event,
  kind: string,
  slug: string,
): Promise<boolean> {
  validateReviewSlug(kind, slug);

  const db = getTradingDb(event);
  const [row] = await db
    .update(researchReviews)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(researchReviews.kind, kind),
        eq(researchReviews.slug, slug),
        isNull(researchReviews.deletedAt),
      ),
    )
    .returning({ id: researchReviews.id });

  return !!row;
}
