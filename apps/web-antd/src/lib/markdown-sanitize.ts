import DOMPurify from 'dompurify';

/**
 * Markdown HTML 安全清理模块
 * 
 * 使用 DOMPurify 清理 Markdown 渲染后的 HTML，防止 XSS 攻击。
 * DOMPurify 基于 DOM 解析，比 sanitize-html（字符串替换）更安全，
 * 能有效防御 mutation XSS（mXSS）等绕过手法。
 * 
 * 安全策略：
 * - 在 DOMPurify 默认白名单基础上增加 Markdown 需要的标签和属性
 * - 明确禁止危险标签（style, form, iframe 等）
 * - 不使用 ALLOWED_TAGS 重写白名单，避免在不同运行环境（浏览器/happy-dom）下的兼容性问题
 * - 默认白名单 + FORBID_TAGS 的组合更健壮
 */

// 在 vitest happy-dom 环境中，DOMPurify 默认实例可能无法正确检测 DOM
// 使用 DOMPurify(window) 工厂调用确保实例正确初始化
const purify = DOMPurify(window);

/**
 * DOMPurify 钩子：清理属性后执行
 * 为所有 <a> 标签强制设置安全属性，防止新窗口访问原窗口.opener
 */
purify.addHook('afterSanitizeAttributes', (node) => {
  // 为所有 <a> 标签强制设置安全属性
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');  // 在新窗口打开
    node.setAttribute('rel', 'noopener noreferrer');  // 防止新窗口访问原窗口，防止 referrer 泄露
  }
});

/**
 * 清理 Markdown 渲染后的 HTML
 * 
 * 安全配置：
 * - ADD_TAGS: 添加 Markdown 需要的额外标签（input 用于任务列表）
 * - ADD_ATTR: 添加 Markdown 需要的额外属性（checked, disabled, align, valign）
 * - FORBID_TAGS: 明确禁止的危险标签列表
 * - ALLOW_DATA_ATTR: false，禁止 data-* 自定义属性（可能包含恶意脚本）
 * - ALLOWED_URI_REGEXP: 只允许 http/https/mailto 协议，禁止 javascript: 等危险协议
 * 
 * @param html Markdown 渲染后的 HTML 字符串
 * @returns 清理后的安全 HTML 字符串
 * 
 * @example
 * const dirtyHtml = '<p onclick="alert(1)">Hello</p>';
 * const cleanHtml = sanitizeMarkdownHtml(dirtyHtml);  // <p>Hello</p>
 */
export function sanitizeMarkdownHtml(html: string) {
  return purify.sanitize(html, {
    // 在默认白名单基础上额外允许 Markdown 需要的标签
    ADD_TAGS: [
      'input',  // 任务列表（marked 生成 checkbox）
    ],
    // 在默认白名单基础上额外允许的属性
    ADD_ATTR: [
      'checked', 'disabled',  // 任务列表 checkbox
      'align', 'valign',  // 表格对齐
    ],
    // 明确禁止的危险标签（含内容一并移除）
    FORBID_TAGS: [
      'style',      // 防止 CSS 注入
      'form',       // 防止表单伪造
      'iframe',     // 防止页面嵌入
      'object',     // 防止插件加载
      'embed',      // 防止外部资源嵌入
      'applet',     // 防止 Java 小程序
      'base',       // 防止基础 URL 劫持
    ],
    // 禁止 data-* 自定义属性（可能包含恶意脚本）
    ALLOW_DATA_ATTR: false,
    // 只允许 https / http / mailto 协议，禁止 javascript: 等危险协议
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
  });
}
