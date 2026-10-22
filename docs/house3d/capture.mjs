import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const edgePath = process.env.EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/155.0.4283.62/msedge.exe'
const outputDir = resolve('docs/house3d')
const browser = await chromium.launch({ executablePath: edgePath, headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  await mkdir(outputDir, { recursive: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const supabaseRequests = []
  page.on('request', request => { if (/supabase/i.test(request.url())) supabaseRequests.push(request.url()) })
  page.on('console', message => { if (message.text().includes('[house-3d dev]')) console.log(message.text()) })
  page.on('pageerror', error => console.error('[pageerror]', error.message))
  await page.goto('http://127.0.0.1:5173/dev/house-3d', { waitUntil: 'networkidle' })
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(1000)
  for (const [testId, filename] of [['preset-zero','all-zero.png'],['preset-mixed','mixed-roof-30.png'],['preset-complete','all-complete.png']]) {
    await page.getByTestId(testId).click(); await page.waitForTimeout(500)
    await page.screenshot({ path: resolve(outputDir, filename), fullPage: true }); console.log(`Saved ${filename}`)
  }
  await page.getByTestId('view-end').click(); await page.waitForTimeout(500)
  await page.screenshot({ path: resolve(outputDir, 'end-view.png'), fullPage: true }); console.log('Saved end-view.png')
  await page.close()
  const diagnostic = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  diagnostic.on('request', request => { if (/supabase/i.test(request.url())) supabaseRequests.push(request.url()) })
  diagnostic.on('console', message => { if (message.text().includes('[house-3d dev]')) console.log(message.text()) })
  await diagnostic.goto('http://127.0.0.1:5173/dev/house-3d', { waitUntil: 'networkidle' })
  await diagnostic.locator('canvas').waitFor({ state: 'visible', timeout: 15000 }); await diagnostic.waitForTimeout(500)
  await diagnostic.getByTestId('cycles').click()
  await diagnostic.waitForFunction(() => document.querySelectorAll('ol li').length === 20, { timeout: 30000 })
  const diagnostics = await diagnostic.locator('ol li').allTextContents()
  const readings = diagnostics.map(line => line.match(/geometries=\d+, textures=\d+, programs=\d+, live WebGL contexts=\d+/)?.[0])
  if (diagnostics.length !== 20 || readings.some(reading => !reading) || new Set(readings).size !== 1) throw new Error('Renderer/context readings changed across cycles')
  await diagnostic.locator('details').evaluate(element => { element.open = true })
  const contextSummary = await diagnostic.locator('details p').innerText()
  if (!contextSummary.includes('20; живых: 0')) throw new Error(`Expected 20 created and 0 live contexts, got: ${contextSummary}`)
  console.log('LIFECYCLE_DIAGNOSTICS_BEGIN'); diagnostics.forEach((row, index) => console.log(`${index+1}. ${row}`)); console.log('LIFECYCLE_DIAGNOSTICS_END')
  if (supabaseRequests.length) throw new Error(`Dev page made Supabase requests: ${supabaseRequests.join(', ')}`)
  console.log('Supabase requests: 0')
} finally { await browser.close() }
