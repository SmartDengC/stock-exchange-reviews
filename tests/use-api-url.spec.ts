import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApiUrl } from "~/composables/use-api-url";

describe("useApiUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      public: { tradingApiBase: "http://localhost:8000/" },
    }));
  });

  it("turns API paths into absolute Trading Cloud URLs", () => {
    const apiUrl = useApiUrl();

    expect(apiUrl("/api/trading/export.xlsx?from=2026-08-01")).toBe(
      "http://localhost:8000/api/trading/export.xlsx?from=2026-08-01",
    );
    expect(apiUrl(null)).toBe("");
  });
});
