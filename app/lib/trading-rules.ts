import { generatedTradingRulesMarkdown } from "./generated-trading-rules";

export type TradingRule = {
  title: string;
  description: string;
};

export type TradingRulesDocument = {
  title: string;
  updatedAt: string;
  rules: TradingRule[];
};

function plainText(value: string) {
  return value
    .replace(/^>\s?/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseTradingRules(markdown: string): TradingRulesDocument {
  const title = plainText(markdown.match(/^#\s+(.+)$/m)?.[1] ?? "交易规则");
  const updatedAt = plainText(markdown.match(/^>\s*最后更新[：:]\s*(.+)$/m)?.[1] ?? "");
  const headings = [...markdown.matchAll(/^##\s+(.+)$/gm)];

  const rules = headings.map((heading, index) => {
    const bodyStart = (heading.index ?? 0) + heading[0].length;
    const bodyEnd = headings[index + 1]?.index ?? markdown.length;
    const description = plainText(
      markdown
        .slice(bodyStart, bodyEnd)
        .replace(/^\s*---\s*$/gm, ""),
    );

    return {
      title: plainText(heading[1] ?? ""),
      description,
    };
  });

  return { title, updatedAt, rules };
}

export const tradingRules = parseTradingRules(generatedTradingRulesMarkdown);
