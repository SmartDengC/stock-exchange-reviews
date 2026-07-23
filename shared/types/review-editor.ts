export type ReviewSourceResponse = {
  content: string;
  path: string;
  sha: string;
};

export type ReviewSaveResponse = {
  commitUrl: string;
  path: string;
  sha: string;
};
