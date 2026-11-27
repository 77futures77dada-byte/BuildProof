// Layout check by DOM (no screenshots): every app route, as each role, at
// 360 / 390 / 768 / 1024 / 1440 px wide (900 high), light and dark.
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
// FAIL also on visible text heavier than 500 (any route, landing included) and when the
// overview at 1440x900 / 1366x768 needs scrolling to show panel, model, stages and the card row.
// Below 1024 px the browser runs as touch (pointer: coarse, 48 px targets); from 1024 px as mouse
// (36 px targets, 16 px secondary text).
// FAIL also when the report sheet «Отправить» is not fully visible at 360×553 /
// 390×553 (growth and decrease). Landing controls and text must also meet a11y minimums.
// Last line: `check-overflow: routes=… loads=… overflow_failures=… render_failures=… page_errors=… a11y_small_targets=… a11y_small_text=… send_checks=… send_failures=… landing_small_*=…`.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { preview } from 'vite'
import { installFixtures, findChrome, SUPA } from './lib/fixtures.mjs'
import { installLinksOwnerMocks } from './lib/fixtures-links-owner.mjs'
import { installLinksPublicMocks, WORKER_TOKEN, CLIENT_TOKEN } from './lib/fixtures-links-public.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const argv = process.argv.slice(2)
const STRICT_A11Y = argv.includes('--strict-a11y')
const VERBOSE = argv.includes('--verbose')
const ONLY = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null
const CONCURRENCY = Number(process.env.CHECK_CONCURRENCY ?? 4)
const WIDTHS = [360, 390, 768, 1024, 1440] // 1024: narrowest desktop (overview variant B, three columns)
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
  ['review (k15 off: not routed)', '/review', 'foreman'],
  ['client dashboard', '/dashboard', 'client'],
  ['client project', P, 'client'],
  ['client stages', `${P}/stages`, 'client'],
  ['client photos', `${P}/photos`, 'client'],
  ['client issues', `${P}/issues`, 'client'],
  // links (contracts worker-links.md / client-links.md; /api answered by scripts/lib/fixtures-links-*.mjs)
  ['project links', `${P}/links`, 'gc'],
  ['review queue (gc)', '/review', 'gc'],
  ['worker link', `/w#t=${WORKER_TOKEN}`, null, '/w'],
  ['client link', `/c#t=${CLIENT_TOKEN}`, null, '/c'],
  ['link missing', '/w', null],
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

  // a11y: touch targets — 48 px on touch screens (pointer: coarse), 36 px with a mouse
  // (pointer: fine, desktop density, owner 2026-11-28). Phones/tablets below 1024 px run as touch.
  const fine = window.matchMedia('(pointer: fine)').matches
  const minTarget = fine ? 36 : 48
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
    if (r.height < minTarget || r.width < minTarget) smallTargets.push(`${tag} «${(el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24)}» ${Math.round(r.width)}×${Math.round(r.height)}`)
  }
  // a11y: visible text under 17 px (16 px from 1024 px: desktop secondary captions), one hit per element.
  // Weight: no visible text above 500 anywhere (owner 2026-11-28), SVG text included.
  const minText = vw >= 1024 ? 16 : 17
  const smallText = []
  const heavyText = []
  for (const el of document.querySelectorAll('svg text')) {
    if (!el.textContent.trim() || !visible(el)) continue
    const w = Number(getComputedStyle(el).fontWeight)
    if (w > 500) heavyText.push(`svg text ${w} «${el.textContent.trim().slice(0, 24)}»`)
  }
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
    const cs = getComputedStyle(el)
    const size = parseFloat(cs.fontSize)
    if (Number(cs.fontWeight) > 500) heavyText.push(`${el.tagName.toLowerCase()} ${cs.fontWeight} «${n.textContent.trim().slice(0, 24)}»`)
    if (size < minText) smallText.push(`${el.tagName.toLowerCase()} ${size}px «${n.textContent.trim().slice(0, 24)}»`)
  }
  const rootEl = document.getElementById('root')
  return {
    finalPath: location.pathname,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: vw,
    offenders,
    smallTargets,
    smallText,
    heavyText,
    rootText: (rootEl?.innerText ?? '').trim().length,
    h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).filter(Boolean).join(' | ').slice(0, 60),
    // what makes this screen this screen: active tab + first heading inside <main>
    tab: (document.querySelector('nav a[aria-current="page"]')?.textContent ?? '').trim(),
    mainHeading: (document.querySelector('main h1, main h2, main h3')?.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40),
  }
}

// ---------- run ----------
const NOISE = /Failed to load resource|net::ERR_|favicon|ERR_ABORTED|status of 40[0-9]|\b401\b/i
const results = [] // one per load
const themeSeen = [] // data-theme and #bp-root background per load (one theme on every screen)
const jobs = []
for (const scheme of SCHEMES) for (const width of WIDTHS) for (const role of new Set(ROUTES.map((r) => r[2]))) jobs.push({ scheme, width, role })

async function runJob({ scheme, width, role }) {
  const touch = width < 1024 // phones and small tablets: pointer: coarse, 48 px targets
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT }, colorScheme: scheme, locale: 'ru-RU', hasTouch: touch, isMobile: touch })
  await installFixtures(ctx, { as: role, extended: true })
  await installLinksOwnerMocks(ctx)
  await installLinksPublicMocks(ctx)
  await ctx.addInitScript((t) => { try { localStorage.setItem('bp-theme', t) } catch { /* no storage */ } }, scheme) // theme is data-theme (src/lib/theme.ts), not only the media query
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
      const theme = await page.evaluate(() => ({ attr: document.documentElement.dataset.theme ?? '', rootBg: getComputedStyle(document.getElementById('bp-root') ?? document.body).backgroundColor }))
      themeSeen.push({ name, path, scheme, width, ...theme })
      const rendered = m.rootText > 0 && m.finalPath === (expected ?? path)
      results.push({ ...current, ...m, rendered, overflow: m.scrollWidth > m.innerWidth || m.offenders.length > 0 })
    } catch (e) {
      results.push({ ...current, rendered: false, overflow: false, error: e.message.split('\n')[0], offenders: [], smallTargets: [], smallText: [], heavyText: [] })
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

// Send button of the worker report sheet must be fully on screen without
// scrolling on a small phone with the keyboard-less browser chrome (360×553),
// in growth mode and in decrease mode (brief §2.5), light and dark.
// Selectors: [data-sheet="report"] [data-main] (Button primary), «−10» = [data-minus].
const SEND_VIEWPORTS = [[360, 553], [390, 553]]
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const sendFailures = []
let sendChecks = 0
async function sendVisible(page) {
  return page.evaluate(() => {
    const btn = document.querySelector('[data-sheet="report"] [data-main]')
    if (!btn) return { ok: false, why: 'no send button' }
    const r = btn.getBoundingClientRect()
    const inView = r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth && r.height > 0
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    const onTop = !!hit && (hit === btn || btn.contains(hit))
    // the sheet (portal into #bp-root) must carry the same theme as the page behind it
    const sheet = document.querySelector('[data-sheet="report"]')
    const sheetBg = sheet ? getComputedStyle(sheet).backgroundColor : ''
    const pageBg = getComputedStyle(document.getElementById('bp-root') ?? document.body).backgroundColor
    const sameTheme = sheetBg === pageBg
    return { ok: inView && onTop && sameTheme, why: `top ${Math.round(r.top)} bottom ${Math.round(r.bottom)} / ${window.innerHeight}${onTop ? '' : ', covered'}${sameTheme ? '' : `, sheet bg ${sheetBg} ≠ page ${pageBg}`}` }
  })
}
if (!ONLY || 'report-send'.includes(ONLY) || 'worker today'.includes(ONLY)) {
  for (const [width, height] of SEND_VIEWPORTS) {
    for (const scheme of SCHEMES) {
      const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, locale: 'ru-RU' })
      await installFixtures(ctx, { as: 'w1', extended: true })
      await ctx.addInitScript((t) => { try { localStorage.setItem('bp-theme', t) } catch { /* no storage */ } }, scheme) // theme is data-theme (src/lib/theme.ts), not only the media query
      const page = await ctx.newPage()
      const tag = `${width}×${height} ${scheme}`
      try {
        await page.goto(`${base}${P}/today`, { waitUntil: 'networkidle' })
        await page.setInputFiles('input[capture]', { name: 'p.png', mimeType: 'image/png', buffer: PNG_1PX })
        await page.waitForSelector('[data-sheet="report"] [data-main]', { timeout: 8000 })
        await page.waitForTimeout(400) // sheet open transition
        for (const mode of ['growth', 'decrease']) {
          if (mode === 'decrease') {
            await page.click('[data-sheet="report"] [data-minus]')
            await page.waitForSelector('[data-stepper="decrease"]', { timeout: 4000 })
          }
          sendChecks++
          const v = await sendVisible(page)
          if (!v.ok) sendFailures.push(`SEND ${tag} ${mode}: ${v.why}`)
        }
      } catch (e) {
        sendChecks++
        sendFailures.push(`SEND ${tag}: ${String(e.message ?? e).split('\n')[0]}`)
      }
      await ctx.close()
    }
  }
  console.log(`report-send: checks=${sendChecks} failures=${sendFailures.length}${sendFailures.length ? `\n  ${sendFailures.join('\n  ')}` : ''}`)
}

// Default theme with no stored choice (src/lib/theme.ts): navy dark for owner,
// client and signed-out pages; light for worker and foreman. Checked under both
// OS schemes, because the default must not depend on the OS setting.
const DEFAULTS = [[null, '/login', 'dark'], ['gc', '/dashboard', 'dark'], ['client', '/dashboard', 'dark'], ['w1', `${P}/today`, 'light'], ['foreman', P, 'light']]
const defaultFailures = []
let defaultChecks = 0
if (!ONLY || 'theme-default'.includes(ONLY)) {
  for (const [as, path, want] of DEFAULTS) for (const scheme of SCHEMES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: HEIGHT }, colorScheme: scheme, locale: 'ru-RU' })
    await installFixtures(ctx, { as, extended: true })
    const page = await ctx.newPage()
    defaultChecks++
    try {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      const got = await page.evaluate(() => document.documentElement.dataset.theme ?? 'system')
      if (got !== want) defaultFailures.push(`THEME-DEFAULT ${as ?? 'signed-out'} ${path} (OS ${scheme}): ${got}, want ${want}`)
    } catch (e) {
      defaultFailures.push(`THEME-DEFAULT ${as ?? 'signed-out'} ${path}: ${String(e.message ?? e).split('\n')[0]}`)
    }
    await ctx.close()
  }
  console.log(`theme-default: checks=${defaultChecks} failures=${defaultFailures.length}${defaultFailures.length ? `\n  ${defaultFailures.join('\n  ')}` : ''}`)
}

// Sticky/fixed bars at the top must leave the phone screen to the content:
// together ≤ 25 % of a 553 px high screen (browser chrome already took the rest).
const STICKY_ROUTES = [['gc', '/dashboard'], ['gc', P], ['gc', `${P}/stages`], ['w1', `${P}/today`], ['foreman', P]]
const stickyFailures = []
let stickyChecks = 0
if (!ONLY || 'sticky-top'.includes(ONLY)) {
  for (const [width, height] of SEND_VIEWPORTS) for (const [as, path] of STICKY_ROUTES) {
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'ru-RU' })
    await installFixtures(ctx, { as, extended: true })
    await ctx.addInitScript(() => { try { localStorage.setItem('bp-theme', 'system') } catch { /* no storage */ } }) // widest theme label
    const page = await ctx.newPage()
    stickyChecks++
    try {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      await page.evaluate(() => window.scrollTo(0, 400))
      await page.waitForTimeout(200)
      const covered = await page.evaluate(() => {
        let bottom = 0
        for (const el of document.querySelectorAll('#root *')) {
          const cs = getComputedStyle(el)
          if (cs.position !== 'sticky' && cs.position !== 'fixed') continue
          const r = el.getBoundingClientRect()
          if (r.top <= 1 && r.height > 0) bottom = Math.max(bottom, r.bottom) // bars at the top edge; bottom bars start lower
        }
        return Math.round(bottom)
      })
      if (covered > height * 0.25) stickyFailures.push(`STICKY ${as} ${path} @${width}×${height}: top bars cover ${covered} px > 25 %`)
    } catch (e) {
      stickyFailures.push(`STICKY ${as} ${path}: ${String(e.message ?? e).split('\n')[0]}`)
    }
    await ctx.close()
  }
  console.log(`sticky-top: checks=${stickyChecks} failures=${stickyFailures.length}${stickyFailures.length ? `\n  ${stickyFailures.join('\n  ')}` : ''}`)
}

// Overview, variant B: at 1440x900 and 1366x768 (mouse) everything fits without scrolling — panel with
// its main button, 3D model, stage list, and the row of issues / people / feed (owner 2026-11-28).
const FIT_VIEWPORTS = [[1440, 900], [1366, 768]]
const FIT_BLOCKS = [
  ['main button', '[data-main]'],
  ['3D model', '.house3d-canvas, [role="status"]'],
  ['stage list', 'main section ul li:last-child'],
  ['issues / people / feed', '[data-fit="cards"]'],
]
const fitFailures = []
let fitBlocks = ''
if (!ONLY || 'overview-fit'.includes(ONLY) || 'project overview'.includes(ONLY)) {
  const counts = []
  for (const [width, height] of FIT_VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'ru-RU' })
    await installFixtures(ctx, { as: 'gc', extended: true })
    const page = await ctx.newPage()
    try {
      await page.goto(`${base}${P}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      const res = await page.evaluate((blocks) => blocks.map(([label, sel]) => {
        const el = document.querySelector(sel)
        if (!el) return { label, ok: false, why: 'not found' }
        const r = el.getBoundingClientRect()
        return { label, ok: r.top >= 0 && r.bottom <= window.innerHeight + 0.5 && r.height > 0, why: `bottom ${Math.round(r.bottom)} / ${window.innerHeight}` }
      }), FIT_BLOCKS)
      const cards = await page.evaluate(() => [...document.querySelectorAll('[data-fit="cards"] > section')].map((c) => Math.round(c.getBoundingClientRect().bottom)))
      const ok = res.filter((x) => x.ok).length
      counts.push(`${width}x${height}:${ok + (res.at(-1).ok ? cards.length - 1 : 0)}/${FIT_BLOCKS.length - 1 + Math.max(cards.length, 1)}`)
      for (const x of res.filter((y) => !y.ok)) fitFailures.push(`FIT overview @${width}x${height}: ${x.label} ${x.why}`)
    } catch (e) {
      fitFailures.push(`FIT overview @${width}x${height}: ${String(e.message ?? e).split('\n')[0]}`)
    }
    await ctx.close()
  }
  fitBlocks = counts.join(',')
  console.log(`overview-fit: ${fitBlocks} failures=${fitFailures.length}${fitFailures.length ? `\n  ${fitFailures.join('\n  ')}` : ''}`)
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
let heavyText = 0
let landingTargets = 0
let landingText = 0
const failLines = [...sendFailures, ...defaultFailures, ...stickyFailures, ...fitFailures]
// One theme on every screen: data-theme = the chosen one, and the same #bp-root background on all routes.
let themeFailures = 0
for (const scheme of SCHEMES) {
  const seen = themeSeen.filter((x) => x.scheme === scheme)
  for (const x of seen.filter((y) => y.attr !== scheme)) { themeFailures++; failLines.push(`THEME ${x.name} ${x.path} @${x.width} ${scheme}: data-theme="${x.attr}"`) }
  const bgs = [...new Set(seen.map((x) => x.rootBg))]
  if (bgs.length > 1) { themeFailures++; failLines.push(`THEME ${scheme}: #bp-root backgrounds differ between screens: ${bgs.map((b) => `${b} (${seen.filter((x) => x.rootBg === b).map((x) => x.name).slice(0, 3).join(', ')})`).join('; ')}`) }
}
console.log('route | as | screen (h1 · active tab · main heading) | overflow (width/scheme: px) | targets<48 | text<17px')
for (const [k, list] of byRoute) {
  const [name, path, as] = k.split('\t')
  const over = list.filter((r) => r.overflow)
  const notRendered = list.filter((r) => !r.rendered)
  const errs = [...new Set(list.flatMap((r) => r.errors))]
  const maxT = Math.max(...list.map((r) => r.smallTargets.length))
  const maxX = Math.max(...list.map((r) => r.smallText.length))
  const heavy = [...new Set(list.flatMap((r) => r.heavyText ?? []))]
  heavyText += heavy.length
  for (const h of heavy.slice(0, 5)) failLines.push(`WEIGHT ${name} ${path}: ${h} > 500`)
  overflowFailures += over.length
  renderFailures += notRendered.length
  pageErrors += errs.length
  // Keep landing counts separate for acceptance reporting, and fail this check unless
  // all landing controls are at least 48 px and all landing text is at least 17 px.
  if (path === '/') { landingTargets += maxT; landingText += maxX } else { a11yTargets += maxT; a11yText += maxX }
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
console.log(`\ncheck-overflow: routes=${byRoute.size} loads=${results.length} overflow_failures=${overflowFailures} render_failures=${renderFailures} page_errors=${pageErrors} a11y_small_targets=${a11yTargets} a11y_small_text=${a11yText} heavy_text=${heavyText} fit_failures=${fitFailures.length} fit_blocks=${fitBlocks} theme_failures=${themeFailures + defaultFailures.length} send_checks=${sendChecks} send_failures=${sendFailures.length} sticky_failures=${stickyFailures.length} landing_small_targets=${landingTargets} landing_small_text=${landingText}${a11yNote}`)
const failed = overflowFailures || renderFailures || pageErrors || heavyText || fitFailures.length || themeFailures || defaultFailures.length || stickyFailures.length || sendFailures.length || landingTargets || landingText || (STRICT_A11Y && (a11yTargets || a11yText))
process.exit(failed ? 1 : 0)
