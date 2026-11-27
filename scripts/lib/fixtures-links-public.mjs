// Public link page mocks for /w (worker by link) and /c (client by link).
// No Supabase session is used by these pages: only `/api/worker-link-*` and
// `/api/client-view` are answered, plus the fake signed photo URLs.
// Wire: installLinksPublicMocks(ctx, { worker: 'ok', client: 'ok' }).
// The tokens below are fixture constants, not secrets.

export const WORKER_TOKEN = 'fixtureWorkerToken_0123456789abcdefghijklmnop'
export const CLIENT_TOKEN = 'fixtureClientToken_0123456789abcdefghijklmnop'

const H = 3600e3
const D = 24 * H
const now = Date.parse('2026-11-27T10:00:00Z')
const iso = (ms) => new Date(ms).toISOString()
const PHOTO = (name) => `/fixture-photos/${name}.png`

const STAGES = {
  project_id: 'p1',
  worker_name: 'Март Сепп',
  stages: [
    { id: '00000000-0000-4000-8000-0000000000a1', name: 'Фундамент', progress_percent: 100 },
    { id: '00000000-0000-4000-8000-0000000000a2', name: 'Кровля', progress_percent: 60 },
    { id: '00000000-0000-4000-8000-0000000000a3', name: 'Электрика — щит, разводка по этажам и проверка заземления', progress_percent: 10 },
    { id: '00000000-0000-4000-8000-0000000000a4', name: 'Отделка', progress_percent: 0 },
  ],
}

const report = (id, stage, pct, status, ago, photos = 1) => ({
  id, stage_id: STAGES.stages[stage].id, claimed_percent: pct, status,
  created_at: iso(now - ago), taken_at: iso(now - ago - 5 * 60e3), device_time: iso(now - ago), uploaded_at: iso(now - ago),
  photos: Array.from({ length: photos }, (_, i) => ({ path: `p1/worker-links/wl1/${id}-${i}.jpg`, url: PHOTO(`${id}-${i}`) })),
})
const REPORTS = [
  report('r1', 1, 60, 'accepted', 2 * H, 3),
  report('r2', 2, 40, 'pending', 26 * H),
  report('r3', 0, 100, 'confirmed', 9 * D),
  report('r4', 1, 30, 'rejected', 12 * D),
]

const CLIENT = {
  project_id: 'p1', project_name: 'Частный дом, Виймси', disclaimer: 'client.disclaimer.percentNotPayment',
  stages: [
    { stage_id: 'c1', name: 'Фундамент', confirmed_percent: 100, updated_at: iso(now - 9 * D), photos: [{ path: 'p1/a.jpg', url: PHOTO('c-a') }, { path: 'p1/b.jpg', url: PHOTO('c-b') }] },
    { stage_id: 'c2', name: 'Кровля', confirmed_percent: 40, updated_at: iso(now - D), photos: [] },
    { stage_id: 'c3', name: 'Окна и двери с подоконниками, откосами и герметизацией примыканий', confirmed_percent: 15, updated_at: iso(now - 3 * D), photos: [{ path: 'p1/c.jpg', url: null }] },
  ],
}

// 1×1 grey PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mOMrAcAAU0A5bZr9cMAAAAASUVORK5CYII=', 'base64')

const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

/**
 * opts.worker: 'ok' | 'empty' (no stages, no reports) | 'invalid' (invalid_worker_link) | 'ratelimit' (submit → 429)
 * opts.client: 'ok' | 'empty' (no visible stages) | 'invalid' (invalid_client_link)
 */
export async function installLinksPublicMocks(ctx, { worker = 'ok', client = 'ok' } = {}) {
  const bearerOk = (route, token) => (route.request().headers().authorization ?? '') === `Bearer ${token}`

  await ctx.route('**/fixture-photos/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG }))

  await ctx.route('**/api/worker-link-stages', (route) => {
    if (worker === 'invalid' || !bearerOk(route, WORKER_TOKEN)) return json(route, 401, { error: 'invalid_worker_link' })
    return json(route, 200, worker === 'empty' ? { ...STAGES, stages: [] } : STAGES)
  })
  await ctx.route('**/api/worker-link-reports**', (route) => {
    if (worker === 'invalid' || !bearerOk(route, WORKER_TOKEN)) return json(route, 401, { error: 'invalid_worker_link' })
    return json(route, 200, { reports: worker === 'empty' ? [] : REPORTS })
  })
  await ctx.route('**/api/worker-link-submit', (route) => {
    if (worker === 'invalid' || !bearerOk(route, WORKER_TOKEN)) return json(route, 401, { error: 'invalid_worker_link' })
    if (worker === 'ratelimit') return json(route, 429, { error: 'worker_link_rate_limit' })
    let body = {}
    try { body = JSON.parse(route.request().postData() ?? '{}') } catch { /* keep {} */ }
    return json(route, 200, { report_id: body.client_request_id ?? 'r-new', status: 'accepted', duplicate_of: null, duplicate_request: false })
  })

  await ctx.route('**/api/client-view', (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    if (client === 'invalid' || !bearerOk(route, CLIENT_TOKEN)) return json(route, 401, { error: 'invalid_client_link' })
    return json(route, 200, client === 'empty' ? { ...CLIENT, stages: [] } : CLIENT)
  })
}
