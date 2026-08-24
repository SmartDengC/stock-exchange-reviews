import { generatedTradingRulesMarkdown } from "./generated-trading-rules";

export type TradingRule = {
  description: string;
  title: string;
};

export type TradingRulesDocument = {
  rules: TradingRule[];
  title: string;
  updatedAt: string;
};

function plainText(value: string) {
  return value
    .replaceAll(/^>\s?/gm, "")
    .replaceAll(/[*_`]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function splitRuleCopy(value: string): TradingRule {
  const copy = plainText(value);
  const sentenceBreak = copy.indexOf("。");
  const phraseBreak = copy.indexOf("；");
  const breakAt = sentenceBreak > 0 ? sentenceBreak : phraseBreak;

  if (breakAt <= 0) {
    return { title: copy, description: "" };
  }

  return {
    title: copy.slice(0, breakAt).trim(),
    description: copy.slice(breakAt + 1).trim(),
  };
}

function parseNumberedRules(markdown: string) {
  const numberedRules = [...markdown.matchAll(/^\s*\d+[、.．]\s*.+$/gm)];

  return numberedRules.map((rule, index) => {
    const bodyStart = rule.index ?? 0;
    const bodyEnd = numberedRules[index + 1]?.index ?? markdown.length;
    const copy = markdown
      .slice(bodyStart, bodyEnd)
      .replace(/^\s*\d+[、.．]\s*/, "");

    return splitRuleCopy(copy);
  });
}

export function parseTradingRules(markdown: string): TradingRulesDocument {
  const title = plainText(markdown.match(/^#\s+(.+)$/m)?.[1] ?? "交易规则");
  const updatedAt = plainText(markdown.match(/^>\s*最后更新[：:]\s*(.+)$/m)?.[1] ?? "");
  const numberedRules = parseNumberedRules(markdown);
  const headings = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  const headingRules = headings.map((heading, index) => {
    const bodyStart = (heading.index ?? 0) + heading[0].length;
    const bodyEnd = headings[index + 1]?.index ?? markdown.length;

    return {
      title: plainText(heading[1] ?? ""),
      description: plainText(
        markdown
          .slice(bodyStart, bodyEnd)
          .replaceAll(/^\s*---\s*$/gm, ""),
      ),
    };
  });
  const rules = numberedRules.length > 0 ? numberedRules : headingRules;

  return { title, updatedAt, rules };
}

export const tradingRules = parseTradingRules(generatedTradingRulesMarkdown);
