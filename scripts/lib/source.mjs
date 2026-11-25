// Small source helpers for the check scripts: blank out comments (keeping
// line numbers) and pull string literals out of TS/JS without a parser.

/** Blank a range with spaces, keeping newlines so line numbers survive. */
const blank = (s) => s.replace(/[^\n]/g, ' ')

/**
 * Lexes TS/TSX/JS: returns the source with comments blanked and the list of
 * string literals ('…', "…", `…` text parts outside ${}). JSX text between
 * tags is left in `code` (it is not a string literal). Regex literals are
 * not recognised; a `/` that is not a comment is passed through.
 */
export function scanJs(src) {
  let out = ''
  const strings = []
  let i = 0
  let line = 1
  const n = src.length
  // Stack of template-literal brace depths, so `${ {a:1} }` nests correctly.
  const tpl = []
  let depth = 0
  const pushString = (text, startLine, kind) => strings.push({ text, line: startLine, kind })

  function readTemplate() {
    // at a position just after ` or after the } closing a ${…}
    let text = ''
    const startLine = line
    while (i < n) {
      const c = src[i]
      if (c === '\\') { text += src.slice(i, i + 2); out += src.slice(i, i + 2); i += 2; continue }
      if (c === '`') { out += c; i++; pushString(text, startLine, 'template'); return }
      if (c === '$' && src[i + 1] === '{') {
        out += '${'; i += 2
        pushString(text, startLine, 'template')
        tpl.push(depth); depth = 0
        return
      }
      if (c === '\n') line++
      text += c; out += c; i++
    }
    pushString(text, startLine, 'template')
  }

  while (i < n) {
    const c = src[i]
    const d = src[i + 1]
    if (c === '/' && d === '/') {
      const end = src.indexOf('\n', i)
      const stop = end === -1 ? n : end
      out += blank(src.slice(i, stop)); i = stop; continue
    }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? n : end + 2
      const chunk = src.slice(i, stop)
      line += (chunk.match(/\n/g) ?? []).length
      out += blank(chunk); i = stop; continue
    }
    if (c === "'" || c === '"') {
      const startLine = line
      let j = i + 1
      let text = ''
      while (j < n && src[j] !== c && src[j] !== '\n') {
        if (src[j] === '\\') { text += src.slice(j, j + 2); j += 2; continue }
        text += src[j]; j++
      }
      out += src.slice(i, j + 1); i = j + 1
      pushString(text, startLine, c)
      continue
    }
    if (c === '`') { out += c; i++; readTemplate(); continue }
    if (c === '{') { depth++; out += c; i++; continue }
    if (c === '}') {
      if (depth === 0 && tpl.length) { depth = tpl.pop(); out += c; i++; readTemplate(); continue }
      depth--; out += c; i++; continue
    }
    if (c === '\n') line++
    out += c; i++
  }
  return { code: out, strings }
}

/** CSS: blank /* … *\/ comments. */
export function stripCss(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, blank)
}

/** HTML: blank <!-- … --> comments. */
export function stripHtml(src) {
  return src.replace(/<!--[\s\S]*?-->/g, blank)
}

/** 1-based line of a character offset. */
export function lineAt(src, offset) {
  let line = 1
  for (let k = 0; k < offset; k++) if (src.charCodeAt(k) === 10) line++
  return line
}
