// Screenshots of the key app screens for the design audit (docs/screens).
//
// The app runs unchanged; only the network is faked. Every request to the
// Supabase host is answered from the fixtures below, so no real account or
// data is needed and nothing leaves the machine. The fixtures are demo data
// for screenshots only — they never ship in the app.
//
//   VITE_SUPABASE_URL=https://fixture.supabase.co VITE_SUPABASE_ANON_KEY=fixture \
//     ALLOW_PLACEHOLDERS=1 npx vite build --outDir <tmp>/dist-fixture
//   npx vite preview --outDir <tmp>/dist-fixture --port 4330
//   node docs/screens/capture.mjs http://localhost:4330 [chrome-path]
//
// Needs `playwright-core` (not a project dependency; run from a scratch folder
// with `npm i playwright-core`) and a local Chrome.
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
// Fixtures (users, tables, the tiny PostgREST, session) live in scripts/lib/fixtures.mjs.
import { PHOTO_SVG, installFixtures } from '../../scripts/lib/fixtures.mjs'

const base = process.argv[2] ?? 'http://localhost:4330'
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const outDir = fileURLToPath(new URL('.', import.meta.url))

const browser = await chromium.launch({ executablePath: chrome })
const errors = []
const problems = []

async function open(path, { as = null, width = 1440, height = 900, scheme = 'light' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, locale: 'ru-RU', deviceScaleFactor: width < 500 ? 2 : 1 })
  await installFixtures(ctx, { as })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`))
  await page.goto(`${base}${path}`)
  await page.waitForLoadState('networkidle')
  // Fonts use font-display: optional, so a first visit paints system fonts.
  // Load once, let the fonts reach the cache, then reload — what a returning
  // user sees.
  await page.evaluate(() => document.fonts.ready)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  return page
}

// Brand and format names allowed on a Russian screen. «D-» is «3D-модель»;
// «u-…@example.ee» are the fixture accounts' e-mails.
const LATIN_OK = new Set(['BuildProof', 'ET', 'RU', 'EN', 'WhatsApp', 'PDF', 'PDF-', 'E-arve', 'D-', 'OÜ', 'Email', 'example', 'ee', 'u-nocompany', 'you', 'firma'])
async function checks(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (over > 0) problems.push(`${label}: horizontal overflow ${over}px`)
  const words = await page.evaluate(() => {
    const parts = [document.body.innerText]
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) parts.push(el.getAttribute('aria-label') ?? '', el.getAttribute('placeholder') ?? '', el.getAttribute('alt') ?? '')
    return parts.join(' ').match(/[A-Za-z][A-Za-z-]*/g) ?? []
  })
  const stray = [...new Set(words.filter((w) => !LATIN_OK.has(w)))]
  if (stray.length) problems.push(`${label}: latin words ${stray.join(', ')}`)
}

const SCREENS = [
  ['01-login', '/login', null],
  ['02-onboarding', '/dashboard', 'nocompany'],
  ['03-dashboard-empty', '/dashboard', 'empty'],
  ['04-dashboard', '/dashboard', 'gc'],
  ['05-project-overview', '/project/p1', 'gc'],
  ['06-project-new', '/project/p4', 'gc'],
  ['07-stages', '/project/p1/stages', 'gc'],
  ['08-issues', '/project/p1/issues', 'gc'],
  ['09-tariff', '/tariff', 'gc'],
  ['10-worker-today', '/project/p1/today', 'w1'],
]
// SET=worker PREFIX=before- → only the worker's phone screens, as worker/<prefix><name>.png
// SET=quickpass PREFIX=after- → «Объекты» and «Обзор объекта», light + dark,
//   390 and 1440, as quickpass/<prefix><name>-<scheme>-<size>.png, plus checks
//   for touch targets (≥ 48 px) and body text size (≥ 17 px).
const WORKER_ONLY = process.env.SET === 'worker'
const QUICKPASS = process.env.SET === 'quickpass'
const PREFIX = process.env.PREFIX ?? ''
const workerDir = `${outDir}worker/`

if (QUICKPASS) {
  const screens = [
    ['dashboard', '/dashboard', 'gc'],
    ['dashboard-empty', '/dashboard', 'empty'],
    ['overview', '/project/p1', 'gc'],
    ['overview-new', '/project/p4', 'gc'],
  ]
  for (const [name, path, as] of screens) {
    for (const scheme of ['light', 'dark']) {
      for (const [suffix, width, height] of [['390x844', 390, 844], ['1440x900', 1440, 900]]) {
        const page = await open(path, { as, width, height, scheme })
        const label = `${name} ${scheme} ${suffix}`
        await checks(page, label)
        if (width === 390 && scheme === 'light') {
          const r = await page.evaluate(() => {
            const small = []
            for (const el of document.querySelectorAll('main a, main button, main summary, main select, header a, header button')) {
              const b = el.getBoundingClientRect()
              if (!b.width || getComputedStyle(el).visibility === 'hidden') continue
              if (b.height < 48) small.push(`${el.tagName.toLowerCase()} «${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 22)}» ${Math.round(b.height)}px`)
            }
            const root = document.querySelector('.bp')
            return { small, base: root ? getComputedStyle(root).fontSize : 'no .bp root' }
          })
          console.log(`${label}: base font ${r.base}; targets < 48px: ${r.small.length ? r.small.join('; ') : 'none'}`)
          if (r.small.length) problems.push(`${label}: small touch targets: ${r.small.join('; ')}`)
        }
        await page.screenshot({ path: `${outDir}quickpass/${PREFIX}${name}-${scheme}-${suffix}.png`, fullPage: true })
        await page.context().close()
      }
    }
  }
  console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`)
  console.log(problems.length ? `PROBLEMS:\n- ${problems.join('\n- ')}` : 'all checks passed')
  await browser.close()
  process.exit(0)
}

if (!WORKER_ONLY) {
  for (const [name, path, as] of SCREENS) {
    for (const [suffix, width, height] of [['390x844', 390, 844], ['1440x900', 1440, 900]]) {
      const page = await open(path, { as, width, height })
      await checks(page, `${name} ${suffix}`)
      await page.screenshot({ path: `${outDir}${name}-${suffix}.png`, fullPage: true })
      await page.context().close()
    }
  }
}

/** Opens a form by its button, attaches a photo, screenshots it. */
async function workerForm(path, button, name) {
  const page = await open(path, { as: 'w1', width: 390, height: 844 })
  const add = page.getByRole('button', { name: button }).first()
  if (await add.count()) {
    await add.click()
    await page.waitForTimeout(300)
    const file = page.locator('input[type=file]').first()
    if (await file.count()) {
      await file.setInputFiles({ name: 'site.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(PHOTO_SVG) })
      await page.waitForTimeout(400)
    } else problems.push(`${name}: no photo input`)
    await checks(page, `${name} 390x844`)
    await page.screenshot({ path: WORKER_ONLY ? `${workerDir}${PREFIX}${name}.png` : `${outDir}${name}-390x844.png`, fullPage: true })
  } else problems.push(`${name}: button ${button} not found`)
  await page.context().close()
}

if (WORKER_ONLY) {
  for (const [name, path] of [['today', '/project/p1/today'], ['stages', '/project/p1/stages'], ['photos', '/project/p1/photos'], ['issues', '/project/p1/issues']]) {
    const page = await open(path, { as: 'w1', width: 390, height: 844 })
    await checks(page, `worker ${name}`)
    await page.screenshot({ path: `${workerDir}${PREFIX}${name}.png`, fullPage: true })
    await page.context().close()
  }
  // «Завершить» on a task opens the photo form a worker sees most.
  await workerForm('/project/p1/today', /завершить/i, 'task-photo-form')
}
// Phone: a worker raises an issue with a photo on the Issues screen.
await workerForm('/project/p1/issues', /проблем|замечани/i, WORKER_ONLY ? 'issue-form' : '11-worker-issue-form')

console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`)
console.log(problems.length ? `PROBLEMS:\n- ${problems.join('\n- ')}` : 'all checks passed')
await browser.close()
