// Screenshots + renderer lifecycle check for the dev page /dev/house-3d.
// Usage (dev server running): node docs/house3d/capture.mjs [baseUrl]
import { chromium } from 'playwright-core'
import { mkdir, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

async function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const root = join(homedir(), 'AppData/Local/ms-playwright')
  const builds = (await readdir(root)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()
  return join(root, builds[0], 'chrome-win64/chrome.exe')
}

const base = process.argv[2] ?? 'http://127.0.0.1:5180'
const url = `${base}/dev/house-3d`
const outputDir = resolve('docs/house3d')
const viewports = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } }
const browser = await chromium.launch({ executablePath: await findChromium(), headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const supabaseRequests = []
const errors = []

async function open(viewport, options = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...options })
  const page = await context.newPage()
  page.on('request', request => { if (/supabase/i.test(request.url())) supabaseRequests.push(request.url()) })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 15000 })
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2')
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'no WebGL'
    gl?.getExtension('WEBGL_lose_context')?.loseContext() // the probe must not count as a leaked context
    return name
  })
  // Rendering pauses off-screen; bring the model into view so frames are current.
  await page.locator('canvas').scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  return { context, page, renderer }
}
const model = page => page.locator('section[aria-label="Модель объекта"]')
const shot = async (page, name) => {
  await model(page).screenshot({ path: resolve(outputDir, name) })
  console.log(`saved ${name}`)
}
const select = (page, part) => page.getByTestId(`select-${part}`).click()

try {
  await mkdir(outputDir, { recursive: true })
  for (const [label, viewport] of Object.entries(viewports)) {
    const { context, page, renderer } = await open(viewport)
    console.log(`${label}: WebGL renderer = ${renderer}`)
    await shot(page, `${label}-1-default.png`)
    await select(page, 'windows'); await page.waitForTimeout(330)
    await shot(page, `${label}-2-windows-mid.png`)
    await page.waitForTimeout(1500)
    await shot(page, `${label}-3-windows-end.png`)
    await select(page, 'roof'); await page.waitForTimeout(1800)
    await shot(page, `${label}-4-roof.png`)
    await select(page, 'electric'); await page.waitForTimeout(1800)
    await shot(page, `${label}-5-electric.png`)
    await page.getByTestId('select-none').click()
    await page.getByTestId('preset-complete').click(); await page.waitForTimeout(1200)
    await shot(page, `${label}-6-all-complete.png`)
    await context.close()

    // System prefers-reduced-motion (not the dev toggle): selection applies instantly.
    const reduced = await open(viewport, { reducedMotion: 'reduce' })
    await select(reduced.page, 'windows')
    await reduced.page.locator('canvas').scrollIntoViewIfNeeded(); await reduced.page.waitForTimeout(150)
    await shot(reduced.page, `${label}-7-reduced-motion-windows.png`)
    await reduced.context.close()
  }

  // Interaction checks on the real canvas and controls.
  {
    const { context, page } = await open(viewports.desktop)
    const pressed = () => page.locator('[data-testid^="select-"][aria-pressed="true"]').getAttribute('data-testid')
    const box = await page.locator('canvas').boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(300)
    console.log(`check: tap on house centre -> ${await pressed()}`)
    await page.mouse.click(box.x + 8, box.y + 8); await page.waitForTimeout(300)
    console.log(`check: tap on empty corner -> ${await pressed()}`)
    const row = page.locator('section[aria-label="Модель объекта"] ul button').nth(2)
    await row.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(200)
    console.log(`check: Enter on list row 3 -> ${await pressed()}, row aria-pressed=${await row.getAttribute('aria-pressed')}`)
    await page.keyboard.press('Enter'); await page.waitForTimeout(200)
    console.log(`check: Enter again (repeat) -> ${await pressed()}`)
    await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    console.log(`check: Esc -> ${await pressed()}`)
    await page.getByRole('button', { name: 'Проиграть стройку' }).click(); await page.waitForTimeout(2600)
    const caption = await page.locator('aside').innerText()
    console.log(`check: playback at 2.6 s -> ${caption.replace(/s+/g, ' ')}`)
    await shot(page, 'desktop-8-playback.png')
    await page.mouse.click(5, 5); await page.waitForTimeout(300)
    console.log(`check: click during playback -> ${(await page.locator('aside').innerText()).replace(/s+/g, ' ')}`)
    await context.close()
  }

  // Renderer lifecycle: 20 mount/unmount cycles must leave no live contexts and equal readings.
  const { context, page } = await open(viewports.mobile)
  await page.getByTestId('cycles').click()
  await page.waitForFunction(() => document.querySelectorAll('ol li').length === 20, null, { timeout: 60000 })
  const rows = await page.locator('ol li').allTextContents()
  const readings = rows.map(row => row.match(/geometries=\d+, textures=\d+, programs=\d+, live WebGL contexts=\d+/)?.[0])
  await page.locator('details').evaluate(element => { element.open = true })
  const contexts = await page.locator('details p').innerText()
  console.log('LIFECYCLE'); rows.forEach(row => console.log(`  ${row}`)); console.log(`  ${contexts}`)
  if (readings.some(reading => !reading) || new Set(readings).size !== 1) throw new Error('renderer readings changed across cycles')
  if (!/живых: 0/.test(contexts)) throw new Error(`live contexts remain: ${contexts}`)
  await context.close()

  console.log(`Supabase requests: ${supabaseRequests.length}`)
  if (supabaseRequests.length) throw new Error(supabaseRequests.join(', '))
  console.log(`Page errors: ${errors.length}`); errors.forEach(error => console.log(`  ${error}`))
} finally { await browser.close() }
