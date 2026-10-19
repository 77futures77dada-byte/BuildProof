import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const edgePath = process.env.EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/155.0.4283.62/msedge.exe'
const outputDir = resolve('docs/house3d')
const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})
try {
  await mkdir(outputDir, { recursive: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const supabaseRequests = []
  page.on('request', request => { if (/supabase/i.test(request.url())) supabaseRequests.push(request.url()) })
  page.on('console', message => { if (message.text().includes('[house-3d dev]')) console.log(message.text()) })
  page.on('pageerror', error => console.error('[pageerror]', error.message))
  await page.goto('http://127.0.0.1:5173/dev/house-3d', { waitUntil: 'networkidle' })
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(1200)

  for (const [label, filename] of [
    ['Все этапы 0%', 'all-zero.png'],
    ['Смешанный прогресс', 'mixed-progress.png'],
    ['Все этапы 100%', 'all-complete.png'],
  ]) {
    await page.getByRole('button', { name: label }).click()
    await page.waitForTimeout(900)
    await page.screenshot({ path: resolve(outputDir, filename), fullPage: true })
    console.log(`Saved ${filename}`)
  }

  await page.close()
  const diagnosticsPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  diagnosticsPage.on('request', request => { if (/supabase/i.test(request.url())) supabaseRequests.push(request.url()) })
  diagnosticsPage.on('console', message => { if (message.text().includes('[house-3d dev]')) console.log(message.text()) })
  await diagnosticsPage.goto('http://127.0.0.1:5173/dev/house-3d', { waitUntil: 'networkidle' })
  await diagnosticsPage.locator('canvas').waitFor({ state: 'visible', timeout: 15000 })
  await diagnosticsPage.waitForTimeout(500)
  await diagnosticsPage.getByRole('button', { name: 'mount/unmount ×20' }).click()
  await diagnosticsPage.waitForFunction(() => document.querySelectorAll('ol li').length === 20, { timeout: 30000 })
  const diagnostics = await diagnosticsPage.locator('ol li').allTextContents()
  if (diagnostics.length !== 20) throw new Error(`Expected 20 cycle rows, got ${diagnostics.length}`)
  const readings = diagnostics.map(line => line.match(/geometries=\d+, textures=\d+, programs=\d+, live WebGL contexts=\d+/)?.[0])
  if (readings.some(reading => !reading) || new Set(readings).size !== 1) throw new Error('Renderer/context readings changed across cycles')
  await diagnosticsPage.locator('details').evaluate(element => { element.open = true })
  const contextSummary = await diagnosticsPage.locator('details p').innerText()
  if (!contextSummary.includes('20; живые: 0')) throw new Error(`Expected 20 created and 0 live contexts, got: ${contextSummary}`)
  console.log(await diagnosticsPage.locator('details').innerText())
  console.log('LIFECYCLE_DIAGNOSTICS_BEGIN')
  diagnostics.forEach((line, index) => console.log(`${index + 1}. ${line}`))
  console.log('LIFECYCLE_DIAGNOSTICS_END')
  if (supabaseRequests.length) throw new Error(`Dev page made Supabase requests: ${supabaseRequests.join(', ')}`)
  console.log('Supabase requests: 0')
} finally {
  await browser.close()
}
