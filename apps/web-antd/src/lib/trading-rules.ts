import { generatedTradingRulesMarkdown } from "./generated-trading-rules";

/**
 * 交易规则条目
 * @property title 规则标题（简短概括）
 * @property description 规则描述（详细说明）
 */
export type TradingRule = {
  description: string;
  title: string;
};

/**
 * 交易规则文档结构
 * @property rules 规则列表
 * @property title 文档标题
 * @property updatedAt 最后更新时间
 */
export type TradingRulesDocument = {
  rules: TradingRule[];
  title: string;
  updatedAt: string;
};

/**
 * 提取纯文本：移除 Markdown 格式标记
 * 处理内容：
 * - 移除引用标记（> ）
 * - 移除强调标记（* _ `）
 * - 合并多余空白
 * @param value 原始文本
 * @returns 纯文本
 */
function plainText(value: string) {
  return value
    .replaceAll(/^>\s?/gm, "")  // 移除引用块标记
    .replaceAll(/[*_`]/g, "")  // 移除强调、下划线、代码标记
    .replaceAll(/\s+/g, " ")  // 合并连续空白为单个空格
    .trim();
}

/**
 * 分割规则文本为标题和描述
 * 规则格式：标题。描述 或 标题；描述
 * 优先使用句号（。）分割，其次使用分号（；）
 * @param value 规则文本
 * @returns TradingRule 对象
 */
function splitRuleCopy(value: string): TradingRule {
  const copy = plainText(value);
  const sentenceBreak = copy.indexOf("。");  // 句号位置
  const phraseBreak = copy.indexOf("；");  // 分号位置
  const breakAt = sentenceBreak > 0 ? sentenceBreak : phraseBreak;  // 优先使用句号

  if (breakAt <= 0) {
    return { title: copy, description: "" };  // 无法分割时，全部作为标题
  }

  return {
    title: copy.slice(0, breakAt).trim(),  // 分割点之前为标题
    description: copy.slice(breakAt + 1).trim(),  // 分割点之后为描述
  };
}

/**
 * 解析编号规则列表
 * 匹配格式：
 * - "1、规则内容"
 * - "1. 规则内容"
 * - "1．规则内容"
 * @param markdown Markdown 源码
 * @returns 解析后的规则数组
 */
function parseNumberedRules(markdown: string) {
  const numberedRules = [...markdown.matchAll(/^\s*\d+[、.．]\s*.+$/gm)];  // 匹配编号行

  return numberedRules.map((rule, index) => {
    const bodyStart = rule.index ?? 0;  // 当前规则起始位置
    const bodyEnd = numberedRules[index + 1]?.index ?? markdown.length;  // 下一条规则起始位置或文档末尾
    const copy = markdown
      .slice(bodyStart, bodyEnd)  // 截取当前规则的完整内容
      .replace(/^\s*\d+[、.．]\s*/, "");  // 移除编号前缀

    return splitRuleCopy(copy);
  });
}

/**
 * 解析交易规则 Markdown 文档
 * 支持两种格式：
 * 1. 编号列表格式（优先）：
 *    ```
 *    # 交易规则
 *    > 最后更新：2024-01-01
 *    1、规则一。描述内容
 *    2、规则二。描述内容
 *    ```
 * 2. 二级标题格式（备选）：
 *    ```
 *    # 交易规则
 *    ## 规则一
 *    描述内容
 *    ## 规则二
 *    描述内容
 *    ```
 * 
 * @param markdown Markdown 源码
 * @returns 解析后的交易规则文档
 */
export function parseTradingRules(markdown: string): TradingRulesDocument {
  // 提取文档标题（# 开头的一级标题）
  const title = plainText(markdown.match(/^#\s+(.+)$/m)?.[1] ?? "交易规则");
  
  // 提取最后更新时间（> 最后更新：或 > 最后更新:）
  const updatedAt = plainText(markdown.match(/^>\s*最后更新 [：:]\s*(.+)$/m)?.[1] ?? "");
  
  // 尝试解析编号规则
  const numberedRules = parseNumberedRules(markdown);
  
  // 解析二级标题规则
  const headings = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  const headingRules = headings.map((heading, index) => {
    const bodyStart = (heading.index ?? 0) + heading[0].length;  // 标题行结束位置
    const bodyEnd = headings[index + 1]?.index ?? markdown.length;  // 下一个标题位置或文档末尾

    return {
      title: plainText(heading[1] ?? ""),  // 二级标题作为规则标题
      description: plainText(
        markdown
          .slice(bodyStart, bodyEnd)  // 截取标题之间的内容
          .replaceAll(/^\s*---\s*$/gm, ""),  // 移除水平分隔线
      ),
    };
  });
  
  // 优先使用编号规则，否则使用标题规则
  const rules = numberedRules.length > 0 ? numberedRules : headingRules;

  return { title, updatedAt, rules };
}

/**
 * 预解析的交易规则（从生成的 Markdown 文件加载）
 * 在模块加载时自动解析，供应用直接使用
 */
export const tradingRules = parseTradingRules(generatedTradingRulesMarkdown);
