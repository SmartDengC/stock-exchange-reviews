export type MemoAttachment = {
  accessUrl: string;
  contentType: string;
  createdAt: string;
  fileName: string;
  id: string;
  size: number;
};

export type Memo = {
  attachments: MemoAttachment[];
  createdAt: string;
  id: string;
  sourceType: 'text';
  text: string;
  updatedAt: string;
  version: number;
};

export type MemoListResponse = {
  hasMore: boolean;
  items: Memo[];
  page: number;
  pageSize: number;
  total: number;
};
