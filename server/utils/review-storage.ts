import { Buffer } from "node:buffer";

export type ReviewKind = "daily" | "weekly";

export type GitHubRepositoryConfig = {
  branch: string;
  owner: string;
  repo: string;
  token: string;
};

export type GitHubReviewSource = {
  content: string;
  path: string;
  sha: string;
};

export type GitHubReviewSaveResult = {
  commitUrl: string;
  path: string;
  sha: string;
};

type Fetcher = typeof fetch;

type GitHubContentPayload = {
  content?: string;
  encoding?: string;
  path?: string;
  sha?: string;
  type?: string;
};

type GitHubUpdatePayload = {
  commit?: { html_url?: string };
  content?: { path?: string; sha?: string } | null;
};

export const MAX_REVIEW_BYTES = 2 * 1024 * 1024;

export class ReviewValidationError extends Error {}

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function resolveReviewPath(kind: string, slug: string) {
  if (kind === "daily" && /^\d{4}-\d{2}-\d{2}$/.test(slug)) {
    return `reviews/${slug}.md`;
  }
  if (kind === "weekly" && /^\d{4}-W\d{2}$/.test(slug)) {
    return `reviews/weekly/${slug}.md`;
  }
  throw new ReviewValidationError("复盘类型或编号不合法");
}

export function validateReviewContent(content: unknown): asserts content is string {
  if (typeof content !== "string" || !content.trim()) {
    throw new ReviewValidationError("Markdown 内容不能为空");
  }
  if (Buffer.byteLength(content, "utf8") > MAX_REVIEW_BYTES) {
    throw new ReviewValidationError("Markdown 内容不能超过 2 MB");
  }
}

export function encodeMarkdown(content: string) {
  return Buffer.from(content, "utf8").toString("base64");
}

export function decodeMarkdown(content: string) {
  return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
}

function repositoryUrl(config: GitHubRepositoryConfig, path: string) {
  const owner = encodeURIComponent(config.owner);
  const repo = encodeURIComponent(config.repo);
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
}

function headers(config: GitHubRepositoryConfig) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function githubError(response: Response) {
  let message = `GitHub API 请求失败（${response.status}）`;
  try {
    const payload = await response.json() as { message?: string };
    if (payload.message) message = payload.message;
  } catch {
    // Keep the status-based fallback when GitHub did not return JSON.
  }
  return new GitHubApiError(response.status, message);
}

export async function readGitHubReview(
  config: GitHubRepositoryConfig,
  path: string,
  fetcher: Fetcher = fetch,
): Promise<GitHubReviewSource> {
  const url = new URL(repositoryUrl(config, path));
  url.searchParams.set("ref", config.branch);
  const response = await fetcher(url, { headers: headers(config) });
  if (!response.ok) throw await githubError(response);

  const payload = await response.json() as GitHubContentPayload;
  if (
    payload.type !== "file"
    || payload.encoding !== "base64"
    || !payload.content
    || !payload.sha
  ) {
    throw new GitHubApiError(502, "GitHub 返回了无法识别的文件内容");
  }

  return {
    content: decodeMarkdown(payload.content),
    path: payload.path ?? path,
    sha: payload.sha,
  };
}

export async function writeGitHubReview(
  config: GitHubRepositoryConfig,
  path: string,
  content: string,
  sha: string,
  slug: string,
  fetcher: Fetcher = fetch,
): Promise<GitHubReviewSaveResult> {
  validateReviewContent(content);
  if (!sha.trim()) throw new ReviewValidationError("缺少文件版本信息，请重新加载");

  const response = await fetcher(repositoryUrl(config, path), {
    method: "PUT",
    headers: headers(config),
    body: JSON.stringify({
      branch: config.branch,
      content: encodeMarkdown(content),
      message: `docs: update ${slug} review from market diary`,
      sha,
    }),
  });
  if (!response.ok) {
    const error = await githubError(response);
    if ([401, 403, 404].includes(error.status)) {
      throw new GitHubApiError(
        403,
        "GitHub Token 没有 Contents 写权限，或未被授予当前仓库访问权",
      );
    }
    throw error;
  }

  const payload = await response.json() as GitHubUpdatePayload;
  const nextSha = payload.content?.sha;
  const commitUrl = payload.commit?.html_url;
  if (!nextSha || !commitUrl) {
    throw new GitHubApiError(502, "GitHub 未返回提交结果");
  }

  return {
    commitUrl,
    path: payload.content?.path ?? path,
    sha: nextSha,
  };
}
