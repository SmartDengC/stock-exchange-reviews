import type {
  DailyReviewInput,
  DailyReviewView,
  TradeExecutionInput,
  TradeInput,
  TradeListFilters,
  TradeListResponse,
  TradeView,
  TradingDashboard,
  TradingOption,
  TradingOptionsResponse,
  TradingRule,
  TradingRuleInput,
} from '#/shared/types/trading';

import { apiUrl, requestClient } from './request';

/**
 * 获取交易仪表盘数据
 * @param params 查询参数
 * @param params.from 开始日期（YYYY-MM-DD）
 * @param params.to 结束日期（YYYY-MM-DD）
 * @param signal AbortSignal，用于取消请求
 * @returns 仪表盘数据（总盈亏、胜率、交易数等）
 */
function getTradingDashboard(
  params: { from?: string; to?: string } = {},
  signal?: AbortSignal,
) {
  return requestClient.get<TradingDashboard>('/api/trading/dashboard', {
    params,
    ...(signal ? { signal } : {}),
  });
}

/**
 * 获取交易列表
 * @param filters 筛选条件（日期范围、市场、状态等）
 * @param filters.query 搜索关键词（品种代码/名称）
 * @param signal AbortSignal，用于取消请求
 * @returns 交易列表及分页信息
 */
function listTrades(filters: TradeListFilters = {}, signal?: AbortSignal) {
  const { query, ...params } = filters;
  return requestClient.get<TradeListResponse>('/api/trading/trades', {
    params: { ...params, q: query },  // query 参数使用 q 键
    ...(signal ? { signal } : {}),
  });
}

/**
 * 获取单笔交易详情
 * @param id 交易 ID
 * @returns 交易详情
 */
function getTrade(id: string) {
  return requestClient.get<TradeView>(`/api/trading/trades/${id}`);
}

/**
 * 创建新交易
 * @param input 交易数据
 * @returns 创建后的交易对象
 */
function createTrade(input: TradeInput) {
  return requestClient.post<TradeView>('/api/trading/trades', input);
}

/**
 * 更新交易
 * 使用 PATCH 方法，支持乐观锁（携带 version 字段）
 * @param id 交易 ID
 * @param input 更新的交易数据（必须包含 version）
 * @returns 更新后的交易对象
 * @note 版本冲突时返回 409
 */
function updateTrade(id: string, input: TradeInput) {
  return requestClient.request<TradeView>(`/api/trading/trades/${id}`, {
    data: input,
    method: 'PATCH',
  });
}

function createTradeExecution(tradeId: string, input: TradeExecutionInput) {
  return requestClient.post<TradeView>(`/api/trading/trades/${tradeId}/executions`, input);
}

function updateTradeExecution(tradeId: string, executionId: string, input: TradeExecutionInput) {
  return requestClient.request<TradeView>(
    `/api/trading/trades/${tradeId}/executions/${executionId}`,
    { data: input, method: 'PATCH' },
  );
}

function deleteTradeExecution(tradeId: string, executionId: string) {
  return requestClient.delete<TradeView>(
    `/api/trading/trades/${tradeId}/executions/${executionId}`,
  );
}

/**
 * 删除交易
 * 使用乐观锁，需要携带 version 参数
 * @param id 交易 ID
 * @param version 交易版本号
 * @returns { ok: boolean }
 * @note 版本冲突时返回 409
 */
function deleteTrade(id: string, version: number) {
  return requestClient.delete<{ ok: boolean }>(`/api/trading/trades/${id}`, {
    params: { version },
  });
}

/**
 * 获取每日复盘
 * @param date 日期（YYYY-MM-DD）
 * @returns 复盘详情
 */
function getDailyReview(date: string) {
  return requestClient.get<DailyReviewView>(
    `/api/trading/daily-reviews/${date}`,
  );
}

/**
 * 保存每日复盘
 * 使用 PUT 方法，全量更新
 * @param date 日期（YYYY-MM-DD）
 * @param input 复盘数据
 * @returns 保存后的复盘对象
 */
function saveDailyReview(date: string, input: DailyReviewInput) {
  return requestClient.put<DailyReviewView>(
    `/api/trading/daily-reviews/${date}`,
    input,
  );
}

/**
 * 获取交易选项（下拉框数据）
 * @returns 交易选项（市场列表、策略列表等）
 */
function getTradingOptions() {
  return requestClient.get<TradingOptionsResponse>('/api/trading/options');
}

/**
 * 更新交易选项
 * @param input 更新的选项数据
 * @returns 更新后的选项
 */
function updateTradingOptions(input: Record<string, unknown>) {
  return requestClient.request<TradingOptionsResponse>(
    '/api/trading/options',
    { data: input, method: 'PATCH' },
  );
}

/**
 * 更新单个交易选项
 * @param id 选项 ID
 * @param input 更新的选项数据
 * @returns 更新后的选项
 */
function updateTradingOption(id: string, input: Record<string, unknown>) {
  return requestClient.request<TradingOption>(
    `/api/trading/options/${id}`,
    { data: input, method: 'PATCH' },
  );
}

/**
 * 删除交易选项
 * @param id 选项 ID
 * @returns 更新后的交易选项
 */
function deleteTradingOption(id: string) {
  return requestClient.delete<TradingOptionsResponse>(
    `/api/trading/options/${id}`,
  );
}

/**
 * 上传交易附件
 * 支持批量上传，每笔交易最多 10 张，单张最大 15MB
 * @param id 交易 ID
 * @param files 文件列表（JPEG/PNG/WebP）
 * @returns 上传结果数组
 */
function uploadTradeAttachments(id: string, files: File[]) {
  return Promise.all(
    files.map((file) => {
      const form = new FormData();
      form.append('file', file, file.name);
      return requestClient.post(
        `/api/trading/trades/${id}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
    }),
  );
}

/**
 * 更新附件属性
 * @param tradeId 交易 ID
 * @param attachmentId 附件 ID
 * @param data 更新的属性
 * @param data.isCover 是否设为封面
 * @param data.sortOrder 排序顺序
 * @returns 更新后的交易对象
 */
function updateAttachment(
  tradeId: string,
  attachmentId: string,
  data: { isCover?: boolean; sortOrder?: number },
) {
  return requestClient.request<TradeView>(
    `/api/trading/trades/${tradeId}/attachments/${attachmentId}`,
    { data, method: 'PATCH' },
  );
}

/**
 * 删除附件
 * @param tradeId 交易 ID
 * @param attachmentId 附件 ID
 * @returns 删除后的交易对象
 */
function deleteAttachment(tradeId: string, attachmentId: string) {
  return requestClient.delete<TradeView>(
    `/api/trading/trades/${tradeId}/attachments/${attachmentId}`,
  );
}

/**
 * 生成交易数据导出 URL
 * @param filters 筛选条件
 * @returns Excel 导出 URL（带筛选参数）
 */
function exportUrl(filters: TradeListFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key === 'query' ? 'q' : key, String(value));
    }
  }
  return apiUrl(
    `/api/trading/export.xlsx${params.size > 0 ? `?${params.toString()}` : ''}`,
  );
}

/**
 * 获取交易规则列表
 * @param signal AbortSignal，用于取消请求
 * @returns 交易规则列表
 */
function listTradingRules(signal?: AbortSignal) {
  return requestClient.get<TradingRule[]>('/api/trading/rules', {
    ...(signal ? { signal } : {}),
  });
}

/**
 * 创建交易规则
 * @param input 规则数据
 * @returns 创建后的规则对象
 */
function createTradingRule(input: TradingRuleInput) {
  return requestClient.post<TradingRule>('/api/trading/rules', input);
}

/**
 * 更新交易规则
 * @param id 规则 ID
 * @param input 更新的规则数据
 * @returns 更新后的规则对象
 */
function updateTradingRule(id: string, input: TradingRuleInput) {
  return requestClient.request<TradingRule>(
    `/api/trading/rules/${id}`,
    { data: input, method: 'PATCH' },
  );
}

/**
 * 删除交易规则
 * @param id 规则 ID
 * @param version 规则版本号
 * @returns { ok: boolean }
 */
function deleteTradingRule(id: string, version: number) {
  return requestClient.delete<{ ok: boolean }>(
    `/api/trading/rules/${id}`,
    { params: { version } },
  );
}

export {
  createTrade,
  createTradeExecution,
  createTradingRule,
  deleteAttachment,
  deleteTrade,
  deleteTradeExecution,
  deleteTradingOption,
  deleteTradingRule,
  exportUrl,
  getDailyReview,
  getTrade,
  getTradingDashboard,
  getTradingOptions,
  listTrades,
  listTradingRules,
  saveDailyReview,
  updateAttachment,
  updateTrade,
  updateTradeExecution,
  updateTradingOption,
  updateTradingOptions,
  updateTradingRule,
  uploadTradeAttachments,
};
