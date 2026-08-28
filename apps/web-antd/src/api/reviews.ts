import type { ResearchReview, ResearchReviewFilters } from '#/types/research';

import { requestClient } from './request';

/**
 * 获取研究复盘列表
 * @param filters 筛选条件
 * @param filters.kind 复盘类型（daily/weekly）
 * @param filters.from 开始日期
 * @param filters.to 结束日期
 * @param signal AbortSignal，用于取消请求
 * @returns 复盘列表
 */
function listResearchReviews(
  filters: ResearchReviewFilters = {},
  signal?: AbortSignal,
) {
  return requestClient.get<ResearchReview[]>('/api/reviews', {
    params: filters,
    ...(signal ? { signal } : {}),
  });
}

/**
 * 获取单篇研究复盘
 * @param kind 复盘类型（daily/weekly）
 * @param slug 复盘标识（日期或周数）
 * @returns 复盘详情
 */
function getResearchReview(kind: string, slug: string) {
  return requestClient.get<ResearchReview>(`/api/reviews/${kind}/${slug}`);
}

/**
 * 保存研究复盘
 * 使用 PUT 方法，全量更新
 * @param kind 复盘类型（daily/weekly）
 * @param slug 复盘标识（日期或周数）
 * @param data 复盘数据
 * @param data.content 内容（Markdown）
 * @param data.dateLabel 日期标签（展示用）
 * @param data.title 标题
 * @param data.version 版本号（乐观锁）
 * @returns 保存后的复盘对象
 * @note 版本冲突时返回 409
 */
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

/**
 * 删除研究复盘
 * @param kind 复盘类型（daily/weekly）
 * @param slug 复盘标识（日期或周数）
 * @returns { ok: boolean }
 */
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
