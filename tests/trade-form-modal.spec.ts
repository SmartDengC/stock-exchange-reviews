import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import TradeFormModal from "~/components/TradeFormModal.vue";

describe("TradeFormModal", () => {
  it("only closes through explicit close controls", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({
      options: [],
      settings: {
        defaultUsdtCnyRate: "7.2",
      },
    }));

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
});
