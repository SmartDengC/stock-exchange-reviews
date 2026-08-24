import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import TradeFormModal from "~/components/TradeFormModal.vue";

describe("TradeFormModal", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("only closes through explicit close controls", async () => {
    const api = vi.fn().mockResolvedValue({
      options: [],
      settings: {
        defaultUsdtCnyRate: "7.2",
      },
    });
    vi.stubGlobal("useNuxtApp", () => ({ $api: api }));

    const wrapper = mount(TradeFormModal, {
      props: {
        open: true,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });
    await flushPromises();

    await wrapper.get(".trade-modal-backdrop").trigger("click");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("close")).toBeUndefined();

    await wrapper.get(".trade-modal-close").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);

    const cancelButton = wrapper.findAll("button")
      .find((button) => button.text() === "取消");
    expect(cancelButton).toBeDefined();
    await cancelButton!.trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(2);
  });

  it("uploads each screenshot directly as multipart form data", async () => {
    const api = vi.fn()
      .mockResolvedValueOnce({ options: [], settings: { defaultUsdtCnyRate: "7.2" } })
      .mockResolvedValueOnce({ id: "trade-1", version: 1 })
      .mockResolvedValueOnce({});
    vi.stubGlobal("useNuxtApp", () => ({ $api: api }));

    const wrapper = mount(TradeFormModal, {
      props: { open: true },
      global: { stubs: { Teleport: true, Transition: false } },
    });
    await flushPromises();

    const file = new File(["image"], "chart.png", { type: "image/png" });
    const input = wrapper.get('input[type="file"]');
    Object.defineProperty(input.element, "files", { configurable: true, value: [file] });
    await input.trigger("change");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(api).toHaveBeenNthCalledWith(2, "/api/trading/trades", expect.objectContaining({ method: "POST" }));
    const uploadOptions = api.mock.calls[2]?.[1] as { method: string; body: FormData };
    expect(api.mock.calls[2]?.[0]).toBe("/api/trading/trades/trade-1/attachments");
    expect(uploadOptions.method).toBe("POST");
    expect(uploadOptions.body).toBeInstanceOf(FormData);
    const uploadedFile = uploadOptions.body.get("file") as File;
    expect(uploadedFile.name).toBe("chart.png");
    expect(uploadedFile.type).toBe("image/png");
    expect(uploadedFile.size).toBe(file.size);
  });
});
