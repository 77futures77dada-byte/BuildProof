// Screenshots of the app redesign for the PR: 390×844 and 1440×900, light,
// plus dark for the worker screens at 390. Uses the same fixture Supabase as
// scripts/check-overflow.mjs (scripts/lib/fixtures.mjs); nothing leaves the machine.
//
//   ALLOW_PLACEHOLDERS=1 VITE_SUPABASE_URL=https://fixture.supabase.co VITE_SUPABASE_ANON_KEY=fixture npm run build
//   node docs/screens/redesign/capture.mjs
// Writes <name>-<light|dark>-<WxH>.png next to this file.
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { preview } from 'vite'
import { installFixtures, findChrome } from '../../../scripts/lib/fixtures.mjs'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const outDir = fileURLToPath(new URL('.', import.meta.url))
const P = '/project/p1'
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

// [name, path, as, { dark?: true, sheet?: 'report' | 'decrease' }]
const SHOTS = [
  ['01-login', '/login', null],
  ['02-dashboard', '/dashboard', 'gc'],
  ['03-dashboard-empty', '/dashboard', 'empty'],
  ['04-overview', P, 'gc'],
  ['05-overview-new', '/project/p4', 'gc'],
  ['06-stages', `${P}/stages`, 'gc'],
  ['07-photos', `${P}/photos`, 'gc'],
  ['08-issues', `${P}/issues`, 'gc'],
  ['09-people', `${P}/settings`, 'gc'],
  ['10-tariff', '/tariff', 'gc'],
  ['11-worker-today', `${P}/today`, 'w1', { dark: true }],
  ['12-report-sheet', `${P}/today`, 'w1', { dark: true, sheet: 'report' }],
  ['13-report-decrease', `${P}/today`, 'w1', { dark: true, sheet: 'decrease' }],
  ['14-foreman-overview', P, 'foreman'],
  ['15-client-overview', P, 'client'],
]
const SIZES = [[390, 844], [1440, 900]]

const chrome = await findChrome()
const server = await preview({ root, logLevel: 'silent', preview: { port: 4391, strictPort: false, open: false, host: '127.0.0.1' } })
const base = (server.resolvedUrls?.local?.[0] ?? 'http://127.0.0.1:4391/').replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: chrome })
let n = 0
for (const [name, path, as, opts = {}] of SHOTS) {
  const variants = SIZES.map(([w, h]) => ['light', w, h])
  if (opts.dark) variants.push(['dark', 390, 844])
  for (const [scheme, width, height] of variants) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, locale: 'ru-RU', deviceScaleFactor: width < 500 ? 2 : 1 })
    await installFixtures(ctx, { as, extended: true })
    const page = await ctx.newPage()
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
    if (opts.sheet) {
      await page.setInputFiles('input[capture]', { name: 'p.png', mimeType: 'image/png', buffer: PNG_1PX })
      await page.waitForSelector('[data-sheet="report"] [data-main]', { timeout: 8000 })
      if (opts.sheet === 'decrease') await page.click('[data-sheet="report"] [data-minus]')
    }
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(outDir, `${name}-${scheme}-${width}x${height}.png`) })
    n++
    await ctx.close()
  }
}
await browser.close()
await new Promise((r) => server.httpServer.close(r))
console.log(`capture: ${n} screenshots in docs/screens/redesign/`)
