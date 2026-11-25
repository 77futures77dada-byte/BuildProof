// Russian UI text must not contain Latin words (untranslated strings, mixed
// keyboard layouts like «Сохранить c» with a Latin c, English leftovers).
//
// Sources:
//   src/i18n/locales/ru.json          every string value (nested keys)
//   src/features/landing/copy/ru.ts   every string / template literal (parsed from
//                                     source; text inside ${…} is code, not copy)
// Tolerated: tokens in scripts/check-ru-latin.allow.json (whole words, any case),
// i18next {{var}} / $t(key) / <0>…</0> / <strong> tags, URLs, e-mails.
// In ru.ts, code-like literals (all lower-case ASCII without spaces, e.g. 'ok',
// 'stage-roof', import paths) are skipped: they are keys and ids, not copy.
//
//   node scripts/check-ru-latin.mjs     exit 1 if any offending string
// Last line: `check-ru-latin: offending=<n> strings=<n> (json=<n>, landing=<n>)`.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { scanJs } from './lib/source.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const JSON_FILE = 'src/i18n/locales/ru.json'
const TS_FILE = 'src/features/landing/copy/ru.ts'
const { tokens } = JSON.parse(readFileSync(join(root, 'scripts/check-ru-latin.allow.json'), 'utf8'))
const ALLOW = new Set(tokens.map((t) => t.toLowerCase()))

/** Latin words left after removing tolerated syntax; [] = clean. */
function latinWords(text) {
  const cleaned = text
    .replace(/\{\{[^}]*\}\}/g, ' ')                       // {{var}}, {{count, number}}
    .replace(/\$t\([^)]*\)/g, ' ')                        // $t(nested.key)
    .replace(/<\/?[A-Za-z0-9]+\s*\/?>/g, ' ')              // <0>, </0>, <1/>, <strong>
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ')          // URLs
    .replace(/[\p{L}\p{N}._+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu, ' ') // e-mails (also «имя@домен.ee»)
    .replace(/\\[nrtu][0-9a-fA-F]{0,4}/g, ' ')             // escapes left in TS literals
  const words = cleaned.match(/[\p{N}]*\p{Script=Latin}[\p{Script=Latin}\p{N}²'’-]*/gu) ?? []
  return words
    .map((w) => w.replace(/[-'’]+$/u, ''))
    .filter((w) => !ALLOW.has(w.toLowerCase()) && !ALLOW.has(w.replace(/^\p{N}+/u, '').toLowerCase()))
}

const offending = []
let jsonCount = 0
let tsCount = 0

// ru.json
const walk = (node, path) => {
  if (typeof node === 'string') {
    jsonCount++
    const bad = latinWords(node)
    if (bad.length) offending.push({ where: `${JSON_FILE} ${path}`, text: node, bad })
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k)
  }
}
walk(JSON.parse(readFileSync(join(root, JSON_FILE), 'utf8')), '')

// ru.ts
const src = readFileSync(join(root, TS_FILE), 'utf8')
const srcLines = src.split('\n')
const { strings } = scanJs(src)
for (const s of strings) {
  const lineText = srcLines[s.line - 1] ?? ''
  if (/^\s*(import|export\s+\*|export\s+\{[^}]*\}\s+from)\b/.test(lineText)) continue
  if (!s.text.trim()) continue
  if (/^[a-z0-9_.\-/#:]+$/.test(s.text)) continue // code-like: ids, keys, paths
  tsCount++
  const bad = latinWords(s.text)
  if (bad.length) {
    const key = lineText.match(/^\s*([A-Za-z_$][\w$]*)\s*:/)?.[1]
    offending.push({ where: `${TS_FILE}:${s.line}${key ? ` ${key}` : ''}`, text: s.text, bad })
  }
}

for (const o of offending) console.log(`${o.where}: [${[...new Set(o.bad)].join(', ')}] «${o.text.replace(/\s+/g, ' ').slice(0, 160)}»`)
console.log(`check-ru-latin: offending=${offending.length} strings=${jsonCount + tsCount} (json=${jsonCount}, landing=${tsCount})`)
if (offending.length) process.exit(1)
