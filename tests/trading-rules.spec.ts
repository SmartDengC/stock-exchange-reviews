import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TradingRulesPanel from "~/components/TradingRulesPanel.vue";
import { parseTradingRules, tradingRules } from "~/lib/trading-rules";

describe("trading rules", () => {
  it("parses the title, update date, and all rule sections", () => {
    expect(tradingRules.title).toBe("Boss 交易规则");
    expect(tradingRules.updatedAt).toBe("2026-07-29");
    expect(tradingRules.rules).toHaveLength(9);
    expect(tradingRules.rules[0]).toEqual({
      title: "不教人投资",
      description: "不主动给他人投资建议，分享经验但不代做决策。每个人的资金体量、风险偏好、持仓周期都不同，适合自己的才是对的。",
    });
    expect(tradingRules.rules[7]?.description).toContain("长期活着才能长期赚钱");
    expect(tradingRules.rules[8]).toEqual({
      title: "与其追高，不如抄底",
      description: "宁可错过，不要做错；尊重常识",
    });
  });

  it("keeps multiline numbered rule copy intact", () => {
    const document = parseTradingRules("# 规则\n\n> 最后更新：今天\n\n1、第一条。第一行。\n第二行。\n\n2. 第二条；第二条说明\n");

    expect(document).toEqual({
      title: "规则",
      updatedAt: "今天",
      rules: [
        { title: "第一条", description: "第一行。 第二行。" },
        { title: "第二条", description: "第二条说明" },
      ],
    });
  });

  it("continues to support heading-based rule documents", () => {
    const document = parseTradingRules("# 规则\n\n> 最后更新：今天\n\n## 第一条\n\n第一行。\n第二行。\n\n---\n");

    expect(document).toEqual({
      title: "规则",
      updatedAt: "今天",
      rules: [{ title: "第一条", description: "第一行。 第二行。" }],
    });
  });

  it("renders every rule and the required-reading warning", () => {
    const wrapper = mount(TradingRulesPanel, {
      props: { document: tradingRules },
    });

    expect(wrapper.get("#trading-rules-title").text()).toBe("Boss 交易规则");
    expect(wrapper.get(".trading-rules-required").text()).toContain("每笔交易前必读");
    expect(wrapper.get(".trading-rules-updated").text()).toContain("共 9 条");
    expect(wrapper.findAll(".trading-rule")).toHaveLength(9);
    expect(wrapper.text()).toContain("市场的钱永远赚不完，但身体只有一个");
    expect(wrapper.text()).toContain("宁可错过，不要做错；尊重常识");
  });
});
