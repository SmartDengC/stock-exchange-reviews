const PYTHON_KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
  'is', 'lambda', 'match', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True',
  'try', 'while', 'with', 'yield',
]);

const PYTHON_BUILTINS = new Set([
  'bool', 'dict', 'enumerate', 'float', 'int', 'len', 'list', 'max', 'min', 'print', 'range',
  'set', 'str', 'sum', 'super', 'tuple', 'type', 'zip',
]);

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function token(className: string, value: string) {
  return `<span class="${className}">${escapeHtml(value)}</span>`;
}

function stringEnd(source: string, start: number, quoteIndex: number) {
  const quote = source[quoteIndex];
  if (!quote) return start + 1;
  const triple = source.startsWith(quote.repeat(3), quoteIndex);
  const delimiter = quote.repeat(triple ? 3 : 1);
  let cursor = quoteIndex + delimiter.length;
  while (cursor < source.length) {
    if (source[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (source.startsWith(delimiter, cursor)) return cursor + delimiter.length;
    cursor += 1;
  }
  return Math.max(cursor, start + 1);
}

function readString(source: string, index: number) {
  const prefixMatch = source.slice(index).match(/^[rRuUbBfF]{1,2}(?=['"])/);
  const quoteIndex = prefixMatch ? index + prefixMatch[0].length : index;
  if (source[quoteIndex] !== '"' && source[quoteIndex] !== "'") return null;
  const previous = source[index - 1];
  if (index > 0 && previous && /[\w]/.test(previous)) return null;
  const end = stringEnd(source, index, quoteIndex);
  return { end, value: source.slice(index, end) };
}

function readNumber(source: string, index: number) {
  const match = source.slice(index).match(/^(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?[\d_]+)?[jJ]?)/);
  return match?.[0] ?? null;
}

export function highlightPython(source: string) {
  let html = '';
  let index = 0;
  while (index < source.length) {
    const character = source[index] ?? '';
    if (character === '#') {
      const end = source.indexOf('\n', index);
      const commentEnd = end === -1 ? source.length : end;
      html += token('py-comment', source.slice(index, commentEnd));
      index = commentEnd;
      continue;
    }
    const string = character === '"' || character === "'" || /[rRuUbBfF]/.test(character)
      ? readString(source, index)
      : null;
    if (string) {
      html += token('py-string', string.value);
      index = string.end;
      continue;
    }
    const number = /[\d.]/.test(character) ? readNumber(source, index) : null;
    if (number) {
      html += token('py-number', number);
      index += number.length;
      continue;
    }
    const identifier = source.slice(index).match(/^[A-Za-z_]\w*/)?.[0];
    if (identifier) {
      const className = PYTHON_KEYWORDS.has(identifier)
        ? 'py-keyword'
        : (PYTHON_BUILTINS.has(identifier)
          ? 'py-builtin'
          : 'py-name');
      html += token(className, identifier);
      index += identifier.length;
      continue;
    }
    if (/[+\-*\/%=<>!&|^~:@]/.test(character)) {
      html += token('py-operator', character);
      index += 1;
      continue;
    }
    html += escapeHtml(character);
    index += 1;
  }
  return html;
}
