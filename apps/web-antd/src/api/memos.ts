import type { Memo, MemoListResponse } from '#/shared/types/memory';

import { requestClient } from './request';

function listMemos(
  params: { from?: string; page?: number; pageSize?: number; q?: string; to?: string } = {},
  signal?: AbortSignal,
) {
  return requestClient.get<MemoListResponse>('/api/memos', {
    params,
    ...(signal ? { signal } : {}),
  });
}

function getMemo(id: string) {
  return requestClient.get<Memo>(`/api/memos/${id}`);
}

function createMemo(text: string, files: File[]) {
  const form = new FormData();
  form.append('text', text);
  files.forEach((file) => form.append('files', file, file.name));
  return requestClient.post<Memo>('/api/memos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

function updateMemo(id: string, input: { pinned?: boolean; text: string; version: number }) {
  return requestClient.request<Memo>(`/api/memos/${id}`, {
    data: input,
    method: 'PATCH',
  });
}

function uploadMemoAttachments(id: string, files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append('files', file, file.name));
  return requestClient.post<Memo>(`/api/memos/${id}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

function deleteMemo(id: string) {
  return requestClient.delete<{ ok: boolean }>(`/api/memos/${id}`);
}

export { createMemo, deleteMemo, getMemo, listMemos, updateMemo, uploadMemoAttachments };
