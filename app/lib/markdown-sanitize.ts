import sanitizeHtml from "sanitize-html";

const allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
  "h1",
  "h2",
  "img",
  "input",
];

export function sanitizeMarkdownHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["class", "id"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      input: ["class", "type", "checked", "disabled"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  });
}
