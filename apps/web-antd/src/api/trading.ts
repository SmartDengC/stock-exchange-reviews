import type {
  DailyReviewInput,
  DailyReviewView,
  TradeInput,
  TradeListFilters,
  TradeListResponse,
  TradeView,
  TradingDashboard,
  TradingOptionsResponse,
} from '#/shared/types/trading';

import { apiUrl, requestClient } from './request';

function getTradingDashboard(params: { from?: string; to?: string } = {}) {
  return requestClient.get<TradingDashboard>('/api/trading/dashboard', {
    params,
  });
}

function listTrades(filters: TradeListFilters = {}) {
  const { query, ...params } = filters;
  return requestClient.get<TradeListResponse>('/api/trading/trades', {
    params: { ...params, q: query },
  });
}

function getTrade(id: string) {
  return requestClient.get<TradeView>(`/api/trading/trades/${id}`);
}

function createTrade(input: TradeInput) {
  return requestClient.post<TradeView>('/api/trading/trades', input);
}

function updateTrade(id: string, input: TradeInput) {
  return requestClient.request<TradeView>(`/api/trading/trades/${id}`, {
    data: input,
    method: 'PATCH',
  });
}

function deleteTrade(id: string, version: number) {
  return requestClient.delete<{ ok: boolean }>(`/api/trading/trades/${id}`, {
    params: { version },
  });
}

function getDailyReview(date: string) {
  return requestClient.get<DailyReviewView>(
    `/api/trading/daily-reviews/${date}`,
  );
}

function saveDailyReview(date: string, input: DailyReviewInput) {
  return requestClient.put<DailyReviewView>(
    `/api/trading/daily-reviews/${date}`,
    input,
  );
}

function getTradingOptions() {
  return requestClient.get<TradingOptionsResponse>('/api/trading/options');
}

function updateTradingOptions(input: Record<string, unknown>) {
  return requestClient.request<TradingOptionsResponse>(
    '/api/trading/options',
    { data: input, method: 'PATCH' },
  );
}

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

function deleteAttachment(tradeId: string, attachmentId: string) {
  return requestClient.delete<TradeView>(
    `/api/trading/trades/${tradeId}/attachments/${attachmentId}`,
  );
}

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

export {
  createTrade,
  deleteAttachment,
  deleteTrade,
  exportUrl,
  getDailyReview,
  getTrade,
  getTradingDashboard,
  getTradingOptions,
  listTrades,
  saveDailyReview,
  updateAttachment,
  updateTrade,
  updateTradingOptions,
  uploadTradeAttachments,
};
