import { describe, expect, it, vi } from "vitest";
import {
  type GitHubApiError,
  MAX_REVIEW_BYTES,
  ReviewValidationError,
  decodeMarkdown,
  encodeMarkdown,
  readGitHubReview,
  resolveReviewPath,
  validateReviewContent,
  writeGitHubReview,
  type GitHubRepositoryConfig,
} from "../server/utils/review-storage";

const repository: GitHubRepositoryConfig = {
  branch: "main",
  owner: "SmartDengC",
  repo: "stock-exchange-reviews",
  token: "test-token",
};

function fetcher(response: Response) {
  return vi.fn(async () => response) as unknown as typeof fetch;
}

describe("review storage", () => {
  it("maps only supported daily and weekly slugs", () => {
    expect(resolveReviewPath("daily", "2026-07-23")).toBe("reviews/2026-07-23.md");
    expect(resolveReviewPath("weekly", "2026-W30")).toBe("reviews/weekly/2026-W30.md");
    expect(() => resolveReviewPath("daily", "../../README")).toThrow(ReviewValidationError);
    expect(() => resolveReviewPath("monthly", "2026-07")).toThrow(ReviewValidationError);
  });

  it("validates content size and preserves UTF-8 through Base64", () => {
    const markdown = "# 市场复盘\n\n港股 **+1.2%**";
    expect(decodeMarkdown(encodeMarkdown(markdown))).toBe(markdown);
    expect(() => validateReviewContent("   ")).toThrow("Markdown 内容不能为空");
    expect(() => validateReviewContent("x".repeat(MAX_REVIEW_BYTES + 1))).toThrow("2 MB");
  });

  it("reads the latest Markdown source and SHA from GitHub", async () => {
    const markdown = "# 最新复盘";
    const mockFetch = fetcher(new Response(JSON.stringify({
      type: "file",
      encoding: "base64",
      content: encodeMarkdown(markdown),
      path: "reviews/2026-07-23.md",
      sha: "old-sha",
    }), { status: 200 }));

    await expect(readGitHubReview(
      repository,
      "reviews/2026-07-23.md",
      mockFetch,
    )).resolves.toEqual({
      content: markdown,
      path: "reviews/2026-07-23.md",
      sha: "old-sha",
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] ?? [];
    expect(String(url)).toContain("ref=main");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
  });

  it("writes with optimistic locking and returns the commit URL", async () => {
    const mockFetch = fetcher(new Response(JSON.stringify({
      content: { path: "reviews/2026-07-23.md", sha: "new-sha" },
      commit: { html_url: "https://github.com/example/commit/123" },
    }), { status: 200 }));

    await expect(writeGitHubReview(
      repository,
      "reviews/2026-07-23.md",
      "# 修改后",
      "old-sha",
      "2026-07-23",
      mockFetch,
    )).resolves.toEqual({
      commitUrl: "https://github.com/example/commit/123",
      path: "reviews/2026-07-23.md",
      sha: "new-sha",
    });

    const [, init] = mockFetch.mock.calls[0] ?? [];
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.sha).toBe("old-sha");
    expect(decodeMarkdown(body.content)).toBe("# 修改后");
    expect(body.branch).toBe("main");
  });

  it("surfaces GitHub conflicts instead of overwriting", async () => {
    const mockFetch = fetcher(new Response(JSON.stringify({
      message: "sha does not match",
    }), { status: 409 }));

    const request = writeGitHubReview(
      repository,
      "reviews/2026-07-23.md",
      "# 冲突内容",
      "stale-sha",
      "2026-07-23",
      mockFetch,
    );

    await expect(request).rejects.toMatchObject<Partial<GitHubApiError>>({
      status: 409,
      message: "sha does not match",
    });
  });

  it("reports a hidden GitHub write-permission 404 as a permission error", async () => {
    const mockFetch = fetcher(new Response(JSON.stringify({
      message: "Not Found",
    }), { status: 404 }));

    const request = writeGitHubReview(
      repository,
      "reviews/2026-07-23.md",
      "# 修改内容",
      "old-sha",
      "2026-07-23",
      mockFetch,
    );

    await expect(request).rejects.toMatchObject<Partial<GitHubApiError>>({
      status: 403,
      message: "GitHub Token 没有 Contents 写权限，或未被授予当前仓库访问权",
    });
  });
});
