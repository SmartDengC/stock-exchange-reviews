import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewDocumentEditor from "~/components/ReviewDocumentEditor.vue";
import type { ReviewRecord } from "~/lib/reviews";
import { resetTestState, testSession as session } from "./mocks/nuxt-imports";

vi.mock("vue-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("vue-router")>(),
  onBeforeRouteLeave: vi.fn(),
}));

vi.mock("md-editor-v3", () => ({
  MdEditor: defineComponent({
    name: "MdEditor",
    props: { modelValue: { type: String, default: "" } },
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      return () => h("textarea", {
        class: "market-markdown-editor",
        value: props.modelValue,
        onInput: (event: Event) => {
          emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
        },
      });
    },
  }),
}));

const review: ReviewRecord = {
  kind: "daily",
  slug: "2026-07-23",
  title: "7月23日市场复盘",
  dateLabel: "2026年7月23日",
  raw: "# 原始复盘\n\n| 指数 | 涨跌 |\n| --- | --- |\n| 上证 | +1% |",
  tables: [],
};

describe("ReviewDocumentEditor", () => {
  beforeEach(() => {
    resetTestState();
    session.ready.value = true;
    session.loggedIn.value = false;
    session.fetch = vi.fn();
    session.clear = vi.fn();
    vi.unstubAllGlobals();
  });

  it("shows the Markdown preview and a login action by default", async () => {
    const wrapper = mount(ReviewDocumentEditor, {
      props: { review },
      global: {
        stubs: {
          AInputPassword: true,
          AModal: true,
          MarkdownDocument: {
            props: ["markdown"],
            template: "<div class=\"markdown-stub\">{{ markdown }}</div>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("原始复盘");
    expect(wrapper.get("button").text()).toContain("管理员登录");
  });

  it("loads the latest GitHub source before entering edit mode", async () => {
    session.loggedIn.value = true;
    const request = vi.fn().mockResolvedValue({
      content: "# GitHub 最新复盘",
      path: "reviews/2026-07-23.md",
      sha: "latest-sha",
    });
    vi.stubGlobal("$fetch", request);

    const wrapper = mount(ReviewDocumentEditor, {
      props: { review },
      global: {
        stubs: {
          AInputPassword: true,
          AModal: true,
          MarkdownDocument: {
            props: ["markdown"],
            template: "<div class=\"markdown-stub\">{{ markdown }}</div>",
          },
        },
      },
    });
    const editButton = wrapper.findAll("button").find((button) => button.text().includes("编辑 Markdown"));
    expect(editButton).toBeTruthy();
    await editButton!.trigger("click");
    await flushPromises();

    expect(request).toHaveBeenCalledWith("/api/reviews/daily/2026-07-23");
    expect(wrapper.text()).toContain("保存到 GitHub");
    expect(wrapper.text()).toContain("预览");
    expect(wrapper.find(".market-markdown-editor").exists()).toBe(true);
  });

  it("shows the API message instead of the generic H3 status message", async () => {
    session.loggedIn.value = true;
    const request = vi.fn()
      .mockResolvedValueOnce({
        content: "# GitHub 最新复盘",
        path: "reviews/2026-07-23.md",
        sha: "latest-sha",
      })
      .mockRejectedValueOnce({
        data: {
          statusMessage: "Server Error",
          message: "GitHub Token 没有 Contents 写权限",
        },
      });
    vi.stubGlobal("$fetch", request);

    const wrapper = mount(ReviewDocumentEditor, {
      props: { review },
      global: {
        stubs: {
          AInputPassword: true,
          AModal: true,
          MarkdownDocument: {
            props: ["markdown"],
            template: "<div class=\"markdown-stub\">{{ markdown }}</div>",
          },
        },
      },
    });

    await wrapper.findAll("button")
      .find((button) => button.text().includes("编辑 Markdown"))!
      .trigger("click");
    await flushPromises();
    await wrapper.get("textarea").setValue("# 已修改");
    await wrapper.findAll("button")
      .find((button) => button.text().includes("保存到 GitHub"))!
      .trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("GitHub Token 没有 Contents 写权限");
    expect(wrapper.text()).not.toContain("Server Error");
  });
});
