// Layout check by DOM (no screenshots): every app route, as each role, at
// 360 / 390 / 768 / 1440 px wide (900 high), light and dark.
//
// Serves the existing dist/ (it does not build). dist/ must be built against the
// fixture Supabase, which scripts/run-checks.mjs does:
//   VITE_SUPABASE_URL=https://fixture.supabase.co VITE_SUPABASE_ANON_KEY=fixture ALLOW_PLACEHOLDERS=1 npm run build
// Supabase traffic is answered from scripts/lib/fixtures.mjs; nothing leaves the machine.
//
// FAIL on: horizontal overflow (documentElement.scrollWidth > innerWidth, or an
// element sticking out of the viewport that is not clipped by a scroll/overflow
// container), a route that does not render (empty #root, wrong final URL),
// page errors and console errors (network noise excluded).
// WARN (FAIL with --strict-a11y): touch targets < 48 × 48 px and visible text
// < 17 px, counted per route (max over widths/schemes).
//
//   node scripts/check-overflow.mjs [--strict-a11y] [--only <substring>] [--verbose]
// Env: CHROME_PATH (else the first local Chrome/Edge), CHECK_CONCURRENCY (default 4).
// Last line: `check-overflow: routes=… loads=… overflow_failures=… render_failures=… page_errors=… a11y_small_targets=… a11y_small_text=…`.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { preview } from 'vite'
import { installFixtures, findChrome, SUPA } from './lib/fixtures.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const argv = process.argv.slice(2)
const STRICT_A11Y = argv.includes('--strict-a11y')
const VERBOSE = argv.includes('--verbose')
const ONLY = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null
const CONCURRENCY = Number(process.env.CHECK_CONCURRENCY ?? 4)
const WIDTHS = [360, 390, 768, 1440]
const HEIGHT = 900
const SCHEMES = ['light', 'dark']

// ---------- routes (src/App.tsx + src/routes/AuthenticatedRoutes.tsx) ----------
// [name, path, as, expectedFinalPath]. `as`: fixture user (scripts/lib/fixtures.mjs),
// null = signed out. Project p1 has stages/photos/tasks/issues; p4 is a fresh one.
const P = '/project/p1'
const ROUTES = [
  ['landing', '/', null],
  ['login', '/login', null],
  ['protected-signed-out', '/dashboard', null, '/login'],
  ['not-found', '/no-such-page', null],
  ['onboarding (no company)', '/dashboard', 'nocompany'],
  ['dashboard empty', '/dashboard', 'empty'],
  ['dashboard', '/dashboard', 'gc'],
  ['tariff', '/tariff', 'gc'],
  ['project overview', P, 'gc'],
  ['project overview (new)', '/project/p4', 'gc'],
  ['project today (gc → overview)', `${P}/today`, 'gc', P],
  ['project stages', `${P}/stages`, 'gc'],
  ['project photos', `${P}/photos`, 'gc'],
  ['project tasks', `${P}/tasks`, 'gc'],
  ['project issues', `${P}/issues`, 'gc'],
  ['project settings', `${P}/settings`, 'gc'],
  ['not-found signed in', '/no-such-page', 'gc'],
  ['worker dashboard', '/dashboard', 'w1'],
  ['worker project → today', P, 'w1', `${P}/today`],
  ['worker today', `${P}/today`, 'w1'],
  ['worker stages', `${P}/stages`, 'w1'],
  ['worker photos', `${P}/photos`, 'w1'],
  ['worker tasks → today', `${P}/tasks`, 'w1', `${P}/today`],
  ['worker issues', `${P}/issues`, 'w1'],
  ['foreman project', P, 'foreman'],
  ['foreman tasks', `${P}/tasks`, 'foreman'],
  ['client dashboard', '/dashboard', 'client'],
  ['client project', P, 'client'],
  ['client stages', `${P}/stages`, 'client'],
  ['client photos', `${P}/photos`, 'client'],
  ['client issues', `${P}/issues`, 'client'],
].filter(([name, path]) => !ONLY || name.includes(ONLY) || path.includes(ONLY))

// ---------- preflight ----------
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('check-overflow: dist/ missing — build first (node scripts/run-checks.mjs does it with the fixture env).')
  process.exit(1)
}
const assets = join(dist, 'assets')
const builtForFixture = existsSync(assets) && readdirSync(assets).some((f) => f.endsWith('.js') && readFileSync(join(assets, f), 'utf8').includes('fixture.supabase.co'))
if (!builtForFixture) {
  console.error(`check-overflow: dist/ was not built with VITE_SUPABASE_URL=${SUPA}; signed-in routes would hit a real backend. Rebuild via run-checks.`)
  process.exit(1)
}
const chrome = await findChrome()
if (!chrome) {
  console.error('check-overflow: no local Chrome/Edge found; set CHROME_PATH.')
  process.exit(1)
}

const server = await preview({ root, logLevel: 'silent', preview: { port: 4390, strictPort: false, open: false, host: '127.0.0.1' } })
const base = (server.resolvedUrls?.local?.[0] ?? 'http://127.0.0.1:4390/').replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: chrome })

// ---------- in-page measurement ----------
function measure() {
  const vw = window.innerWidth
  const cw = document.documentElement.clientWidth
  const describe = (el) => {
    const parts = []
    for (let e = el, i = 0; e && e !== document.body && i < 3; e = e.parentElement, i++) {
      const cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 3) : []
      parts.unshift(`${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}${cls.map((c) => `.${c.replace(/[^\w-]/g, (m) => `\\${m}`)}`).join('')}`)
    }
    return parts.join(' > ')
  }
  const visible = (el) => {
    const s = getComputedStyle(el)
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0
  }
  // Is el clipped horizontally by an ancestor (scroll strip, overflow hidden) or fixed?
  const contained = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e)
      if (s.position === 'fixed') return true
      if (e !== el && /(hidden|clip|auto|scroll)/.test(s.overflowX)) return true
    }
    return false
  }
  const all = [...document.body.querySelectorAll('*')]
  const sticking = new Set()
  for (const el of all) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    if ((r.right > cw + 1 || r.left < -1) && visible(el) && !contained(el)) sticking.add(el)
  }
  // Report only the roots of sticking-out subtrees (the culprits).
  const offenders = [...sticking].filter((el) => !sticking.has(el.parentElement)).map((el) => {
    const r = el.getBoundingClientRect()
    return { sel: describe(el), width: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) }
  }).sort((a, b) => b.right - a.right).slice(0, 5)

  // a11y: touch targets
  const smallTargets = []
  const targets = document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], label')
  for (const el of targets) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'label' && !el.querySelector('input[type=checkbox],input[type=radio]') && !(el.htmlFor && document.getElementById(el.htmlFor)?.matches('input[type=checkbox],input[type=radio]'))) continue
    if ((tag === 'input') && /^(checkbox|radio)$/.test(el.type) && el.closest('label')) continue // the label is the target
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width <= 2 || r.height <= 2) continue // visually hidden
    if (tag === 'a' && getComputedStyle(el).display === 'inline' && el.closest('p, li')) continue // inline link in text
    if (r.height < 48 || r.width < 48) smallTargets.push(`${tag} «${(el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24)}» ${Math.round(r.width)}×${Math.round(r.height)}`)
  }
  // a11y: visible text under 17 px (one hit per element)
  const smallText = []
  const seen = new Set()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement
    if (!el || seen.has(el) || !n.textContent.trim()) continue
    if (el.closest('script, style, noscript, svg, [aria-hidden="true"]')) continue
    seen.add(el)
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width <= 2 || r.height <= 2) continue
    const size = parseFloat(getComputedStyle(el).fontSize)
    if (size < 17) smallText.push(`${el.tagName.toLowerCase()} ${size}px «${n.textContent.trim().slice(0, 24)}»`)
  }
  const rootEl = document.getElementById('root')
  return {
    finalPath: location.pathname,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: vw,
    offenders,
    smallTargets,
    smallText,
    rootText: (rootEl?.innerText ?? '').trim().length,
    h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).filter(Boolean).join(' | ').slice(0, 60),
    // what makes this screen this screen: active tab + first heading inside <main>
    tab: (document.querySelector('nav a[aria-current="page"]')?.textContent ?? '').trim(),
    mainHeading: (document.querySelector('main h1, main h2, main h3')?.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40),
  }
}

// ---------- run ----------
const NOISE = /Failed to load resource|net::ERR_|favicon|ERR_ABORTED|status of 40[0-9]/i
const results = [] // one per load
const jobs = []
for (const scheme of SCHEMES) for (const width of WIDTHS) for (const role of new Set(ROUTES.map((r) => r[2]))) jobs.push({ scheme, width, role })

async function runJob({ scheme, width, role }) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT }, colorScheme: scheme, locale: 'ru-RU' })
  await installFixtures(ctx, { as: role, extended: true })
  const page = await ctx.newPage()
  let current = null
  page.on('pageerror', (e) => current?.errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !NOISE.test(m.text())) current?.errors.push(`console: ${m.text().slice(0, 200)}`)
  })
  let first = true
  for (const [name, path, as, expected] of ROUTES.filter((r) => r[2] === role)) {
    current = { name, path, as, scheme, width, errors: [] }
    try {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 30000 })
      if (first) {
        // Fonts use font-display: optional: the first visit paints system fonts.
        // Reload once per context so the cached fonts are used (what a returning user sees).
        await page.evaluate(() => document.fonts.ready)
        await page.reload({ waitUntil: 'networkidle' })
        first = false
      }
      await page.waitForFunction(() => (document.getElementById('root')?.innerText ?? '').trim().length > 0, null, { timeout: 8000 }).catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(250)
      const m = await page.evaluate(measure)
      const rendered = m.rootText > 0 && m.finalPath === (expected ?? path)
      results.push({ ...current, ...m, rendered, overflow: m.scrollWidth > m.innerWidth || m.offenders.length > 0 })
    } catch (e) {
      results.push({ ...current, rendered: false, overflow: false, error: e.message.split('\n')[0], offenders: [], smallTargets: [], smallText: [] })
    }
  }
  await ctx.close()
}

// Self-test: the detector must see a planted overflow and ignore one inside a
// scroll strip; otherwise every "ok" below would be meaningless.
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: HEIGHT } })
  await installFixtures(ctx, { as: null })
  const page = await ctx.newPage()
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  const clean = await page.evaluate(measure)
  await page.evaluate(() => {
    const strip = document.createElement('div')
    strip.style.cssText = 'overflow-x:auto;width:100%'
    strip.innerHTML = '<div style="width:1200px;height:10px"></div>'
    document.getElementById('root').append(strip)
  })
  const stripped = await page.evaluate(measure)
  await page.evaluate(() => {
    const wide = document.createElement('div')
    wide.id = 'selftest-wide'
    wide.style.cssText = 'width:900px;height:10px'
    document.getElementById('root').append(wide)
  })
  const planted = await page.evaluate(measure)
  await ctx.close()
  const ok = clean.rootText > 0
    && stripped.offenders.length === clean.offenders.length && stripped.scrollWidth === clean.scrollWidth
    && planted.scrollWidth > planted.innerWidth && planted.offenders.some((o) => o.sel.includes('selftest-wide'))
  if (!ok) {
    console.error('check-overflow: SELF-TEST FAILED — detector is not trustworthy', JSON.stringify({ clean, stripped, planted }).slice(0, 800))
    await browser.close()
    await new Promise((r) => server.httpServer.close(r))
    process.exit(1)
  }
  console.log('self-test: planted 900px element detected; scroll-strip content ignored.')
}

const queue = [...jobs]
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await runJob(queue.shift())
}))
await browser.close()
await new Promise((r) => server.httpServer.close(r))

// ---------- report ----------
const key = (r) => `${r.name}\t${r.path}\t${r.as ?? 'signed-out'}`
const byRoute = new Map(ROUTES.map(([name, path, as]) => [key({ name, path, as }), []])) // keep ROUTES order
for (const r of results) byRoute.set(key(r), [...(byRoute.get(key(r)) ?? []), r])

let overflowFailures = 0
let renderFailures = 0
let pageErrors = 0
let a11yTargets = 0
let a11yText = 0
const failLines = []
console.log('route | as | screen (h1 · active tab · main heading) | overflow (width/scheme: px) | targets<48 | text<17px')
for (const [k, list] of byRoute) {
  const [name, path, as] = k.split('\t')
  const over = list.filter((r) => r.overflow)
  const notRendered = list.filter((r) => !r.rendered)
  const errs = [...new Set(list.flatMap((r) => r.errors))]
  const maxT = Math.max(...list.map((r) => r.smallTargets.length))
  const maxX = Math.max(...list.map((r) => r.smallText.length))
  overflowFailures += over.length
  renderFailures += notRendered.length
  pageErrors += errs.length
  a11yTargets += maxT
  a11yText += maxX
  const sample = list.find((r) => r.rendered) ?? list[0]
  const h1 = [sample.h1 || '—', sample.tab && `tab «${sample.tab}»`, sample.mainHeading && `main «${sample.mainHeading}»`].filter(Boolean).join(' · ')
  const overTxt = over.length ? over.map((r) => `${r.width}/${r.scheme[0]}: +${r.scrollWidth - r.innerWidth}`).join(', ') : 'ok'
  console.log(`${name} ${path} | ${as} | ${h1} | ${overTxt} | ${maxT} | ${maxX}`)
  for (const r of notRendered) failLines.push(`RENDER ${name} ${path} @${r.width} ${r.scheme}: ${r.error ?? `root text ${r.rootText} chars, final path ${r.finalPath}`}`)
  for (const r of over.filter((x) => x.scheme === 'light')) {
    failLines.push(`OVERFLOW ${name} ${path} @${r.width}: scrollWidth ${r.scrollWidth} > ${r.innerWidth}${r.offenders.length ? `; ${r.offenders.map((o) => `${o.sel} (w ${o.width}, right ${o.right})`).join('; ')}` : ''}`)
  }
  for (const e of errs) failLines.push(`ERROR ${name} ${path}: ${e}`)
  if (VERBOSE) {
    const worst = list.reduce((a, b) => (b.smallTargets.length > a.smallTargets.length ? b : a))
    if (worst.smallTargets.length) console.log(`   targets @${worst.width} ${worst.scheme}: ${worst.smallTargets.slice(0, 8).join('; ')}`)
    const worstT = list.reduce((a, b) => (b.smallText.length > a.smallText.length ? b : a))
    if (worstT.smallText.length) console.log(`   text @${worstT.width} ${worstT.scheme}: ${worstT.smallText.slice(0, 8).join('; ')}`)
  }
}
if (failLines.length) console.log(`\nFAILURES:\n${failLines.join('\n')}`)
const a11yNote = STRICT_A11Y ? '' : ' (a11y = warnings; --strict-a11y to fail)'
console.log(`\ncheck-overflow: routes=${byRoute.size} loads=${results.length} overflow_failures=${overflowFailures} render_failures=${renderFailures} page_errors=${pageErrors} a11y_small_targets=${a11yTargets} a11y_small_text=${a11yText}${a11yNote}`)
const failed = overflowFailures || renderFailures || pageErrors || (STRICT_A11Y && (a11yTargets || a11yText))
process.exit(failed ? 1 : 0)
