// Fails the production build while src/config/legal.ts still contains
// [placeholder] values (company name, phone, hosting, …). Runs as `prebuild`.
// Preview builds may opt out with ALLOW_PLACEHOLDERS=1.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = fileURLToPath(new URL('../src/config/legal.ts', import.meta.url))
const source = readFileSync(file, 'utf8')

// Quoted string values whose whole content is "[...]", e.g. founderName: '[Имя Фамилия]'.
const found = [...source.matchAll(/^\s*(\w+):\s*(['"`])(\[[^\n]*?\])\2/gm)].map(([, key, , value]) => `${key}: ${value}`)

if (found.length === 0) {
  console.log('check-placeholders: src/config/legal.ts has no placeholders.')
} else if (process.env.ALLOW_PLACEHOLDERS === '1') {
  console.warn(`check-placeholders: ALLOW_PLACEHOLDERS=1, building with ${found.length} placeholder(s) in src/config/legal.ts.`)
} else {
  console.error('check-placeholders: src/config/legal.ts still has placeholders that would ship to production:')
  for (const line of found) console.error(`  ${line}`)
  console.error('Fill them in, or build a preview with ALLOW_PLACEHOLDERS=1.')
  process.exit(1)
}
