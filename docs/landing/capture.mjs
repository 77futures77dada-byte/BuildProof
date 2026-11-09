// Landing checks + screenshots for docs/landing.
//
//   ALLOW_PLACEHOLDERS=1 npm run build && npx vite preview --port 4320
//   node docs/landing/capture.mjs http://localhost:4320 [chrome-path]
//
// Needs `playwright-core` (not a project dependency; run it from a scratch
// folder with `npm i playwright-core`) and a local Chrome.
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'

const base = process.argv[2] ?? 'http://localhost:4320'
const chrome = process.argv[3] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const outDir = fileURLToPath(new URL('.', import.meta.url))
const browser = await chromium.launch({ executablePath: chrome })
const problems = []
const errors = []

async function open({ width, height, scheme = 'light', locale = 'ru-RU' }) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, locale })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${width} ${scheme}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`${width} ${scheme}: ${m.text()}`))
  await page.goto(`${base}/`)
  await page.waitForSelector('.lp h1')
  await page.evaluate(() => document.fonts.ready)
  return page
}

/** Scroll through the page so the lazy animation mounts, then back to the top. */
async function warm(page) {
  await page.locator('#how .loopbox').scrollIntoViewIfNeeded()
  await page.waitForSelector('.site-loop svg [data-layer=actors] g', { timeout: 15000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
}

// 1. No horizontal scroll.
for (const width of [360, 390, 768, 1440]) {
  const page = await open({ width, height: 900 })
  await warm(page)
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  console.log(`h-scroll ${width}px: ${over > 0 ? `${over}px overflow` : 'none'}`)
  if (over > 0) problems.push(`horizontal overflow ${over}px at ${width}px`)
  await page.context().close()
}

// 2. Russian page: no Latin words outside an allow-list (incl. aria-labels and the animation's SVG text).
{
  const page = await open({ width: 1440, height: 900 })
  await warm(page)
  const allowed = new Set(['BuildProof', 'ET', 'RU', 'EN', 'PDF', 'WhatsApp', 'QR', 'Push', 'SMS', 'Telegram', 'DPA', 'E-arve', 'ehituspäevik', 'KMKR', 'OÜ', 'you', 'firma', 'ee', 's'])
  const words = await page.evaluate(() => {
    const parts = [document.body.innerText]
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) parts.push(el.getAttribute('aria-label') ?? '', el.getAttribute('title') ?? '', el.getAttribute('placeholder') ?? '', el.getAttribute('alt') ?? '')
    for (const t of document.querySelectorAll('svg text')) parts.push(t.textContent ?? '')
    return parts.join(' ').match(/[A-Za-zÕÄÖÜõäöüŠšŽž][A-Za-zÕÄÖÜõäöüŠšŽž-]*/g) ?? []
  })
  const stray = [...new Set(words.map((w) => w.replace(/-+$/, '')).filter((w) => !allowed.has(w)))]
  console.log(`latin words on RU page: ${stray.length ? stray.join(', ') : 'none'}`)
  if (stray.length) problems.push(`latin words on RU page: ${stray.join(', ')}`)
  await page.context().close()
}

// 3. Hero above the fold: title, both CTAs, price line, the red (stalled) object.
for (const [width, height] of [[390, 844], [1440, 900]]) {
  const page = await open({ width, height })
  const r = await page.evaluate(() => {
    const bottom = (sel) => document.querySelector(sel)?.getBoundingClientRect().bottom ?? Infinity
    return { h1: bottom('.hero h1'), main: bottom('.ctas .btn-main'), example: bottom('.ctas .btn-ghost'), price: bottom('.hero .trust'), red: bottom('.objs .obj:first-child'), vh: innerHeight }
  })
  const missing = Object.entries(r).filter(([k, v]) => k !== 'vh' && v > r.vh).map(([k]) => k)
  console.log(`hero above the fold at ${width}×${height}: ${missing.length ? `missing ${missing.join(', ')}` : 'all visible'}`, JSON.stringify(r))
  if (missing.length) problems.push(`hero at ${width}×${height}: ${missing.join(', ')} below the fold`)

  // 4. Phone: touch targets ≥ 48 px, base font ≥ 17 px.
  if (width === 390) {
    const small = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('.lp a, .lp button, .lp summary, .lp input')) {
        const b = el.getBoundingClientRect()
        if (b.width === 0 || getComputedStyle(el).display === 'none') continue
        if (b.height < 48) out.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(b.height)}px`)
      }
      return { out, font: getComputedStyle(document.querySelector('.lp')).fontSize }
    })
    console.log(`touch targets < 48px at 390: ${small.out.length ? small.out.join('; ') : 'none'}; base font ${small.font}`)
    if (small.out.length) problems.push(`small touch targets: ${small.out.join('; ')}`)
  }
  await page.context().close()
}

// 5. Screenshots, light and dark.
for (const [name, width, height] of [['desktop-1440x900', 1440, 900], ['mobile-390x844', 390, 844]]) {
  for (const scheme of ['light', 'dark']) {
    const page = await open({ width, height, scheme })
    await page.screenshot({ path: `${outDir}${name}-${scheme}-hero.png` })
    await warm(page)
    await page.screenshot({ path: `${outDir}${name}-${scheme}-full.jpg`, fullPage: true, type: 'jpeg', quality: 78 })
    await page.context().close()
  }
}

console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`)
console.log(problems.length ? `PROBLEMS:\n- ${problems.join('\n- ')}` : 'all checks passed')
await browser.close()
process.exit(problems.length || errors.length ? 1 : 0)
