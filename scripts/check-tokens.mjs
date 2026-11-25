// Design-token guard: colors and fonts live only in src/styles/tokens.css.
//
// Fails (exit 1) on, outside src/styles/tokens.css:
//   hex      — a hex color literal (#abc, #aabbcc, #aabbccdd) in color-like context
//   colorfn  — rgb( / rgba( / hsl( / hsla( / oklch( / oklab( literals
//   font     — a font-family / fontFamily declaration
//   palette  — a Tailwind fixed-palette color class (bg-sky-600, text-white, …) in .ts/.tsx
// Scans src/**/*.{ts,tsx,css} (not *.test.ts[x]) and index.html. Comments are ignored.
//
// Justified exceptions: scripts/check-tokens.allow.json — [{ "file": "src/…", "reason": "…" }]
// ("file" may end with "/" to cover a folder).
//
//   node scripts/check-tokens.mjs            strict: list violations, exit 1 if any
//   node scripts/check-tokens.mjs --report   counts per file + total, always exit 0
//   node scripts/check-tokens.mjs --report --verbose   … plus every violation
// Last line is always `check-tokens: total=<n> hex=… colorfn=… font=… palette=… files=…`.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanJs, stripCss, stripHtml } from './lib/source.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const args = new Set(process.argv.slice(2))
const REPORT = args.has('--report')
const VERBOSE = args.has('--verbose')
const TOKENS_FILE = 'src/styles/tokens.css'

const allowPath = join(root, 'scripts/check-tokens.allow.json')
const allow = existsSync(allowPath) ? JSON.parse(readFileSync(allowPath, 'utf8')) : []
const allowed = (file) => allow.some((a) => (a.file.endsWith('/') ? file.startsWith(a.file) : file === a.file))

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}
const rel = (p) => relative(root, p).split(sep).join('/')
const files = [
  ...walk(join(root, 'src')).map(rel).filter((f) => /\.(ts|tsx|css)$/.test(f) && !/\.test\.tsx?$/.test(f)),
  'index.html',
].filter((f) => f !== TOKENS_FILE && !allowed(f))

const HEX = /(?<=[:\s'"`(,=[])#([0-9a-fA-F]{3,8})(?![\w-])/g
// `href="#add"`, `to="#face"`, querySelector('#bad'): ids / URL fragments, not colors.
const ID_CONTEXT = /(?:href|to|id|htmlFor|hash|querySelector(?:All)?|getElementById|scrollTo|location)\s*[=:(]\s*[{'"`]*\s*$/
const COLORFN = /(?<![\w-])(?:rgba?|hsla?|oklch|oklab)\(/g
const FONT = /(?<![\w-])(?:font-family|fontFamily)\s*:/g
const PALETTE_NAMES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black'
const PALETTE = new RegExp(
  `(?<![\\w-])!?(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|from|to|via|fill|stroke|outline|divide|placeholder|accent|decoration|caret|shadow)-(?:${PALETTE_NAMES})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`,
  'g',
)

const violations = []
for (const file of files) {
  const raw = readFileSync(join(root, file), 'utf8')
  const isJs = /\.(ts|tsx)$/.test(file)
  const code = isJs ? scanJs(raw).code : file.endsWith('.css') ? stripCss(raw) : stripHtml(raw)
  const lines = code.split('\n')
  const rawLines = raw.split('\n')
  lines.forEach((text, idx) => {
    const add = (kind, m) => violations.push({ file, line: idx + 1, kind, snippet: rawLines[idx].trim().slice(0, 140), match: m })
    for (const m of text.matchAll(HEX)) {
      if (![3, 4, 6, 8].includes(m[1].length)) continue
      if (ID_CONTEXT.test(text.slice(0, m.index))) continue
      add('hex', m[0])
    }
    for (const m of text.matchAll(COLORFN)) add('colorfn', m[0])
    for (const m of text.matchAll(FONT)) add('font', m[0])
    if (isJs || /@apply\b/.test(text)) for (const m of text.matchAll(PALETTE)) add('palette', m[0])
  })
}

const KINDS = ['hex', 'colorfn', 'font', 'palette']
const count = (list, kind) => list.filter((v) => v.kind === kind).length
const byFile = new Map()
for (const v of violations) byFile.set(v.file, [...(byFile.get(v.file) ?? []), v])

if (!REPORT || VERBOSE) for (const v of violations) console.log(`${v.file}:${v.line}: ${v.kind}: ${v.match} — ${v.snippet}`)
if (REPORT) {
  const rows = [...byFile].sort((a, b) => b[1].length - a[1].length)
  for (const [file, list] of rows) {
    console.log(`${String(list.length).padStart(5)}  ${file}  (${KINDS.map((k) => `${k} ${count(list, k)}`).join(', ')})`)
  }
}
const summary = `check-tokens: total=${violations.length} ${KINDS.map((k) => `${k}=${count(violations, k)}`).join(' ')} files=${byFile.size} scanned=${files.length} allowlisted=${allow.length}`
console.log(summary)
if (!REPORT && violations.length) {
  console.error('check-tokens: FAIL — move colors/fonts into src/styles/tokens.css (or justify in scripts/check-tokens.allow.json).')
  process.exit(1)
}
