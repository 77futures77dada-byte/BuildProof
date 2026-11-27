// Design-token guard: colours and fonts live only in src/styles/tokens.css,
// text is ≥ 17 px, worker/foreman zone has no weight 400 (docs/design/05-ui.md §6).
//
// Fails (exit 1) on, outside src/styles/tokens.css:
//   hex      — a hex colour literal (#abc, #aabbcc, #aabbccdd) in colour-like context
//   colorfn  — rgb( / rgba( / hsl( / hsla( / oklch( / oklab( literals
//   font     — a font-family / fontFamily declaration whose value is not var(--font-…) / inherit
//   palette  — a Tailwind fixed-palette colour class (bg-sky-600, text-white, …) in .ts/.tsx
//   small    — text below 17 px in app code (not src/features/landing/):
//              classes text-xs / text-sm / text-[<17px] / text-[<1.0625rem] in .ts/.tsx,
//              font-size / font shorthand < 17 px in .css
//   weight   — in worker-zone files (FIELD_ZONE below) and in CSS rules whose selector
//              starts with [data-zone="field"] (tokens.css included): weight 400 / normal /
//              lighter / thin, classes font-normal / font-light / font-thin / font-extralight /
//              text-base, font-size < 17 px
//   heavy    — anywhere (landing and tokens.css included): weight above 500 — classes
//              font-semibold / font-bold / font-extrabold / font-black, CSS font-weight 600–900 /
//              bold / bolder, `font: 600 …`, SVG font-weight / fontWeight 600–900
//              (owner 2026-11-28: max 500 on the whole site, hierarchy by size and colour)
//   base     — tokens.css lacks `input, button, select, textarea { font: inherit`
// Scans src/**/*.{ts,tsx,css} (not *.test.ts[x]) and index.html. Comments are ignored.
//
// Justified exceptions: scripts/check-tokens.allow.json —
//   [{ "file": "src/…", "reason": "…", "kinds"?: ["hex", …], "temporary"?: "<screen step>" }]
// "file" may end with "/" to cover a folder; without "kinds" the whole file is exempt.
// "temporary" entries must be gone by the end of the redesign PR (05-ui.md §«Миграция»).
//
//   node scripts/check-tokens.mjs            strict: list violations, exit 1 if any
//   node scripts/check-tokens.mjs --report   counts per file + total, always exit 0
//   node scripts/check-tokens.mjs --report --verbose   … plus every violation
//   node scripts/check-tokens.mjs --no-allow  ignore temporary entries (what is left to migrate)
// Last line is always `check-tokens: total=<n> hex=… … files=… allowlisted=… temporary=…`.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanJs, stripCss, stripHtml } from './lib/source.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const args = new Set(process.argv.slice(2))
const REPORT = args.has('--report')
const VERBOSE = args.has('--verbose')
const NO_TEMP = args.has('--no-allow')
const TOKENS_FILE = 'src/styles/tokens.css'
const KINDS = ['hex', 'colorfn', 'font', 'palette', 'small', 'weight', 'heavy', 'base']

/** Worker and foreman zone (02-type §7.3): route roots + everything they render. */
const FIELD_ZONE = [
  'src/pages/Today.tsx',
  'src/pages/Review.tsx',
  'src/components/WorkerProjectCard.tsx',
  'src/components/report/',
  'src/components/ui/',
]
/** The small-text rule covers app code; the landing has its own rewrite PR. */
const NOT_APP = ['src/features/landing/']

const under = (file, list) => list.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p))

const allowPath = join(root, 'scripts/check-tokens.allow.json')
const allowAll = existsSync(allowPath) ? JSON.parse(readFileSync(allowPath, 'utf8')) : []
for (const a of allowAll) {
  if (!a.file || !a.reason) throw new Error(`check-tokens.allow.json: every entry needs "file" and "reason": ${JSON.stringify(a)}`)
  for (const k of a.kinds ?? []) if (!KINDS.includes(k)) throw new Error(`check-tokens.allow.json: unknown kind "${k}" in ${a.file}`)
}
const allow = NO_TEMP ? allowAll.filter((a) => !a.temporary) : allowAll
const exempt = (file, kind) => allow.some((a) => under(file, [a.file]) && (!a.kinds || a.kinds.includes(kind)))

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
]

const HEX = /(?<=[:\s'"`(,=[])#([0-9a-fA-F]{3,8})(?![\w-])/g
// `href="#add"`, `to="#face"`, querySelector('#bad'): ids / URL fragments, not colours.
const ID_CONTEXT = /(?:href|to|id|htmlFor|hash|querySelector(?:All)?|getElementById|scrollTo|location)\s*[=:(]\s*[{'"`]*\s*$/
const COLORFN = /(?<![\w-])(?:rgba?|hsla?|oklch|oklab)\(/g
const FONT = /(?<![\w-])(?:font-family|fontFamily)\s*:\s*['"`]?([^;'"`}\n]*)/g
const FONT_OK = /^\s*(?:var\(--font-[\w-]+\)|inherit)\s*$/
const PALETTE_NAMES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black'
const PALETTE = new RegExp(
  `(?<![\\w-])!?(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|from|to|via|fill|stroke|outline|divide|placeholder|accent|decoration|caret|shadow)-(?:${PALETTE_NAMES})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`,
  'g',
)
// Tailwind size classes (any variant prefix, e.g. sm:text-sm, is matched too).
const SMALL_CLASS = /(?<![\w-])text-(?:xs|sm|\[(\d+(?:\.\d+)?)(px|rem)\])(?![\w-])/g
const FIELD_CLASS = /(?<![\w-])(?:font-(?:normal|light|thin|extralight)|text-base)(?![\w-])/g
const px = (n, unit) => (unit === 'rem' ? Number(n) * 16 : Number(n))
// CSS sizes: `font-size: 15px`, `font: 500 14px/1.3 …`, `font: 12px …`
const CSS_SIZE = /(?<![\w-])font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem)\b|(?<![\w-])font\s*:\s*(?:[\w-]+\s+){0,3}?(\d+(?:\.\d+)?)(px|rem)\b/g
const CSS_LIGHT = /(?<![\w-])font-weight\s*:\s*(?:[1-4]00|normal|lighter)\b|(?<![\w-])font\s*:\s*(?:[\w-]+\s+)?[1-4]00\s/g
const HEAVY = [
  /(?<![\w-])font-(?:semibold|bold|extrabold|black)(?![\w-])/g,
  /(?<![\w-])font-weight\s*:\s*(?:[6-9]00|bold|bolder)\b/g,
  /(?<![\w-])font\s*:\s*(?:[\w-]+\s+)?[6-9]00\s/g,
  /['\"]font-weight['\"]\s*:\s*['\"]?[6-9]00/g,
  /fontWeight\s*[=:]\s*\{?['\"]?[6-9]00/g,
]
const cssPx = (m) => (m[1] ? px(m[1], m[2]) : px(m[3], m[4]))

const violations = []
const push = (file, line, kind, snippet, match) => {
  if (!exempt(file, kind)) violations.push({ file, line, kind, snippet: snippet.trim().slice(0, 140), match })
}

/** Yields { selector, body, line } for each innermost CSS rule. */
function* cssRules(code) {
  for (const m of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    yield { selector: m[1].trim(), body: m[2], line: code.slice(0, m.index + m[0].indexOf('{')).split('\n').length }
  }
}
const FIELD_SEL = /^\[data-zone=["']field["']\]/

for (const file of files) {
  const raw = readFileSync(join(root, file), 'utf8')
  const isJs = /\.(ts|tsx)$/.test(file)
  const isCss = file.endsWith('.css')
  const code = isJs ? scanJs(raw).code : isCss ? stripCss(raw) : stripHtml(raw)
  const rawLines = raw.split('\n')
  const field = under(file, FIELD_ZONE)
  const app = !under(file, NOT_APP)
  code.split('\n').forEach((text, idx) => {
    for (const re of HEAVY) for (const m of text.matchAll(re)) push(file, idx + 1, 'heavy', rawLines[idx], m[0])
  })

  if (file === TOKENS_FILE) {
    if (!/input,\s*button,\s*select,\s*textarea\s*\{\s*font:\s*inherit/.test(code)) push(file, 1, 'base', 'input, button, select, textarea { font: inherit } missing', 'font: inherit')
  } else {
    code.split('\n').forEach((text, idx) => {
      const add = (kind, m) => push(file, idx + 1, kind, rawLines[idx], m)
      for (const m of text.matchAll(HEX)) {
        if (![3, 4, 6, 8].includes(m[1].length)) continue
        if (ID_CONTEXT.test(text.slice(0, m.index))) continue
        add('hex', m[0])
      }
      for (const m of text.matchAll(COLORFN)) add('colorfn', m[0])
      for (const m of text.matchAll(FONT)) if (!FONT_OK.test(m[1])) add('font', m[0])
      if (isJs || /@apply\b/.test(text)) {
        for (const m of text.matchAll(PALETTE)) add('palette', m[0])
        if (app) for (const m of text.matchAll(SMALL_CLASS)) if (!m[1] || px(m[1], m[2]) < 17) add('small', m[0])
        if (field) for (const m of text.matchAll(FIELD_CLASS)) add('weight', m[0])
      }
      if (isCss && app) for (const m of text.matchAll(CSS_SIZE)) if (cssPx(m) < 17) add('small', m[0])
    })
  }

  // worker-zone CSS rules, wherever they are written (tokens.css included)
  if (isCss) {
    for (const r of cssRules(code)) {
      if (!r.selector.split(',').some((s) => FIELD_SEL.test(s.trim()))) continue
      for (const m of r.body.matchAll(CSS_LIGHT)) push(file, r.line, 'weight', `${r.selector} { ${m[0]} }`, m[0])
      for (const m of r.body.matchAll(CSS_SIZE)) if (cssPx(m) < 17) push(file, r.line, 'weight', `${r.selector} { ${m[0]} }`, m[0])
    }
  }
}

const count = (list, kind) => list.filter((v) => v.kind === kind).length
const byFile = new Map()
for (const v of violations) byFile.set(v.file, [...(byFile.get(v.file) ?? []), v])

if (!REPORT || VERBOSE) for (const v of violations) console.log(`${v.file}:${v.line}: ${v.kind}: ${v.match} — ${v.snippet}`)
if (REPORT) {
  const rows = [...byFile].sort((a, b) => b[1].length - a[1].length)
  for (const [file, list] of rows) {
    console.log(`${String(list.length).padStart(5)}  ${file}  (${KINDS.filter((k) => count(list, k)).map((k) => `${k} ${count(list, k)}`).join(', ')})`)
  }
}
const temporary = allowAll.filter((a) => a.temporary).length
const summary = `check-tokens: total=${violations.length} ${KINDS.map((k) => `${k}=${count(violations, k)}`).join(' ')} files=${byFile.size} scanned=${files.length} allowlisted=${allow.length} temporary=${NO_TEMP ? 0 : temporary}`
console.log(summary)
if (!REPORT && violations.length) {
  console.error('check-tokens: FAIL — colours/fonts belong in src/styles/tokens.css, text ≥ 17 px, no weight 400 in the field zone (or justify in scripts/check-tokens.allow.json).')
  process.exit(1)
}
