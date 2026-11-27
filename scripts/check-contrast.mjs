// WCAG contrast of the colour tokens in src/styles/tokens.css, light and dark.
//
//   node scripts/check-contrast.mjs [--verbose]
//
// Also: index.html theme-color values equal --bg of each theme.
// Thresholds (owner brief 2026-11-28; a failing pair changes the colour, never the threshold):
//   text           ≥ 4.5 : 1   (muted text, links)
//   worker text    ≥ 7   : 1   (--fg on every page/card background: the worker screen uses them)
//   main button    ≥ 7   : 1   (--on-accent on --accent and --accent-pressed)
//   large / non-text ≥ 3 : 1   (status icons and chip edges, focus ring, field borders, 3D lines)
// Also checks that the dark set under @media (prefers-color-scheme: dark) equals
// :root[data-theme="dark"] (two copies of one theme must not drift).
// Last line: `check-contrast: pairs=… failures=… drift=…`. Exit 1 on any failure.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = readFileSync(fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)), 'utf8')
const VERBOSE = process.argv.includes('--verbose')

function block(selectorRe) {
  const m = css.match(selectorRe)
  if (!m) throw new Error(`check-contrast: block not found: ${selectorRe}`)
  const start = m.index + m[0].length
  let depth = 1, i = start
  while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++ }
  return css.slice(start, i - 1)
}
function vars(body) {
  const out = {}
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}
const light = vars(block(/\n:root\s*\{/))
const darkForced = vars(block(/:root\[data-theme="dark"\]\s*\{/))
const darkMedia = vars(block(/:root:not\(\[data-theme="light"\]\)\s*\{/))
const dark = { ...light, ...darkForced }

function rgba(value, theme) {
  const v = value.startsWith('var(') ? theme[value.slice(4, -1).trim()] : value
  let m = v.match(/^#([0-9a-f]{6})$/i)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1)
  m = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/)
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]]
  throw new Error(`check-contrast: cannot parse colour ${value} (${v})`)
}
const over = (top, bottom) => top.slice(0, 3).map((c, i) => c * top[3] + bottom[i] * (1 - top[3])).concat(1)
const lum = ([r, g, b]) => {
  const ch = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const TEXT = 4.5, WORKER = 7, MAIN = 7, NONTEXT = 3
// [foreground, background, minimum, note]
const PAIRS = [
  ...['--bg', '--surface', '--surface-2'].map((bg) => ['--fg', bg, WORKER, 'text, worker screen']),
  ['--muted-strong', '--bg', TEXT, 'secondary text'], ['--muted-strong', '--surface', TEXT, 'secondary text'],
  ['--muted', '--bg', TEXT, 'long owner text'], ['--muted', '--surface', TEXT, 'long owner text'],
  ...['--bg', '--surface', '--surface-2'].map((bg) => ['--link', bg, WORKER, 'link / text action (worker screen too)']),
  ['--muted-strong', '--surface-2', TEXT, 'secondary text'], ['--muted', '--surface-2', TEXT, 'long owner text'],
  ['--muted-strong', '--warn-bg', TEXT, 'secondary text in banner'],
  ['--inverse-muted', '--inverse-field', TEXT, 'dark band secondary'], ['--inverse-muted', '--inverse-deep', TEXT, 'dark band secondary'],
  ['--inverse-fg', '--inverse-field', WORKER, 'dark band field'], ['--inverse-warn', '--inverse-bg', TEXT, 'dark band warning text'],
  // status inks are also used as words on the landing (landing.css) — text threshold, not 3
  ...['--ok-ink', '--pending-ink', '--stale-ink'].flatMap((ink) => ['--bg', '--surface', '--warn-bg'].map((bg) => [ink, bg, TEXT, 'status word'])),
  ['--on-accent', '--accent', MAIN, 'main button'], ['--on-accent', '--accent-pressed', MAIN, 'main button pressed'],
  ['--fg', '--warn-bg', WORKER, '«не отправлено» banner'],
  ['--on-scrim', '--scrim', TEXT, 'caption on photo scrim'],
  ['--inverse-fg', '--inverse-bg', WORKER, 'dark band text'], ['--inverse-muted', '--inverse-bg', TEXT, 'dark band secondary'],
  ...['--ok-ink', '--pending-ink', '--stale-ink'].flatMap((ink) => ['--bg', '--surface', '--surface-2'].map((bg) => [ink, bg, NONTEXT, 'status icon / chip edge'])),
  ...['--bg', '--surface', '--surface-2', '--warn-bg'].map((bg) => ['--focus', bg, NONTEXT, 'focus ring']),
  ...['--bg', '--surface'].map((bg) => ['--line-strong', bg, NONTEXT, 'form-field edge (1 px)']),
  ['--accent-border', '--bg', NONTEXT, 'main button edge'],
  ['--warn-border', '--warn-bg', NONTEXT, 'banner edge'],
  ...['--house-foundation', '--house-frame', '--house-roof', '--house-windows', '--house-electric', '--house-plumbing', '--house-finish', '--house-contour', '--house-other']
    .map((v) => [v, '--house-bg', NONTEXT, '3D line on model background']),
]

const failures = []
let pairs = 0
for (const [name, theme] of [['light', light], ['dark', dark]]) {
  for (const [fg, bg, min, note] of PAIRS) {
    if (!(fg in theme) || !(bg in theme)) { failures.push(`${name}: missing token ${fg in theme ? bg : fg}`); continue }
    const back = over(rgba(theme[bg], theme), rgba(theme['--bg'], theme))
    const r = ratio(over(rgba(theme[fg], theme), back), back)
    pairs++
    const line = `${name.padEnd(5)} ${fg} on ${bg}: ${r.toFixed(2)} (min ${min}) — ${note}`
    if (r < min) failures.push(line)
    else if (VERBOSE) console.log(`ok    ${line}`)
  }
}
// index.html theme-color (meta + first-paint script) must equal --bg of each theme
const indexHtml = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')
const metaDark = indexHtml.match(/content="(#[0-9A-Fa-f]{6})" media="\(prefers-color-scheme: dark\)"/)?.[1]
const metaLight = indexHtml.match(/content="(#[0-9A-Fa-f]{6})" media="\(prefers-color-scheme: light\)"/)?.[1]
const inlineColors = indexHtml.match(/p==="dark"\?"(#[0-9A-Fa-f]{6})":"(#[0-9A-Fa-f]{6})"/)
for (const [where, got, want] of [['meta dark', metaDark, dark['--bg']], ['meta light', metaLight, light['--bg']], ['first-paint dark', inlineColors?.[1], dark['--bg']], ['first-paint light', inlineColors?.[2], light['--bg']]]) {
  if (!got || got.toUpperCase() !== want.toUpperCase()) failures.push(`index.html ${where} theme-color ${got ?? 'missing'} ≠ --bg ${want}`)
}
const drift = Object.keys({ ...darkForced, ...darkMedia }).filter((k) => darkForced[k] !== darkMedia[k])
for (const k of drift) failures.push(`drift: ${k} is ${darkMedia[k]} under @media dark but ${darkForced[k]} under [data-theme="dark"]`)
if (failures.length) console.log(`FAILURES:\n${failures.join('\n')}`)
console.log(`check-contrast: pairs=${pairs} failures=${failures.length} drift=${drift.length}`)
process.exit(failures.length ? 1 : 0)
