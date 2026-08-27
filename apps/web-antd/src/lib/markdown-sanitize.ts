import DOMPurify from 'dompurify';

/**
 * 使用 DOMPurify 清理 Markdown 渲染后的 HTML。
 * DOMPurify 基于 DOM 解析，比 sanitize-html（字符串替换）更安全，
 * 能有效防御 mutation XSS（mXSS）等绕过手法。
 *
 * 策略：在 DOMPurify 默认白名单基础上增加 Markdown 需要的标签和属性，
 * 并明确禁止危险标签。不使用 ALLOWED_TAGS 重写白名单——
 * 那样需要在每种运行环境（浏览器 / happy-dom）下逐一验证，
 * 而默认白名单 + FORBID_TAGS 更健壮。
 */

// 在 vitest happy-dom 中，DOMPurify 默认实例可能无法正确检测 DOM；
// 使用 DOMPurify(window) 工厂调用确保实例正确初始化。
const purify = DOMPurify(window);

purify.addHook('afterSanitizeAttributes', (node) => {
  // 为所有 <a> 标签强制设置安全属性
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeMarkdownHtml(html: string) {
  return purify.sanitize(html, {
    // 在默认白名单基础上额外允许 Markdown 需要的标签
    ADD_TAGS: [
      // 任务列表（marked 生成 checkbox）
      'input',
    ],
    // 在默认白名单基础上额外允许的属性
    ADD_ATTR: [
      // 任务列表 checkbox
      'checked', 'disabled',
      // 表格对齐
      'align', 'valign',
    ],
    // 明确禁止的危险标签（含内容一并移除）
    FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed', 'applet', 'base'],
    // 禁止 data-* 自定义属性
    ALLOW_DATA_ATTR: false,
    // 只允许 https / http / mailto 协议
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
  });
}
