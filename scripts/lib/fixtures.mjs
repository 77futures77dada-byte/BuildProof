// Fixture Supabase for browser checks (docs/screens/capture.mjs, scripts/check-overflow.mjs).
//
// The app runs unchanged; only the network is faked. Every request to the
// Supabase host is answered from the fixtures below, so no real account or
// data is needed and nothing leaves the machine. The fixtures are demo data
// for checks and screenshots only — they never ship in the app.
//
// The app must be built with VITE_SUPABASE_URL=https://fixture.supabase.co
// (any VITE_SUPABASE_ANON_KEY) so that its storage key is `sb-fixture-auth-token`.

export const SUPA = 'https://fixture.supabase.co'
export const STORAGE_KEY = 'sb-fixture-auth-token'

// ---------- fixtures ----------
const H = 3600e3
const D = 24 * H
export const now = Date.now()
export const ago = (ms) => new Date(now - ms).toISOString()
export const day = (offsetDays) => new Date(now + offsetDays * D).toISOString().slice(0, 10)

const TEMPLATES = ['Фундамент', 'Каркас', 'Кровля', 'Окна', 'Электрика', 'Сантехника', 'Отделка']
export const users = {
  gc: { id: 'u-gc', full_name: 'Андрес Тамм', role: 'gc', company_id: 'c1', locale: 'ru' },
  w1: { id: 'u-w1', full_name: 'Март Сепп', role: 'worker', company_id: 'c1', locale: 'ru' },
  w2: { id: 'u-w2', full_name: 'Яан Ламп', role: 'worker', company_id: 'c1', locale: 'ru' },
  w3: { id: 'u-w3', full_name: 'Тоомас Вийк', role: 'worker', company_id: 'c1', locale: 'ru' },
  empty: { id: 'u-empty', full_name: 'Пирет Каск', role: 'gc', company_id: 'c2', locale: 'ru' },
}
// Extra roles, only with `extended: true` (check-overflow). Kept apart so that
// capture.mjs screenshots stay exactly as they were.
export const extraUsers = {
  client: { id: 'u-client', full_name: 'Кайдо Мянд', role: 'client', company_id: null, locale: 'ru' },
  foreman: { id: 'u-foreman', full_name: 'Пеэтер Ору', role: 'foreman', company_id: 'c1', locale: 'ru' },
}
// Two projects each, so /dashboard shows a list instead of auto-opening the only project.
const extraAccess = [['p1', 'u-client'], ['p2', 'u-client'], ['p1', 'u-foreman'], ['p2', 'u-foreman']]

const project = (id, name, address, status = 'active', company_id = 'c1') => ({ id, company_id, name, address, deadline: day(60), budget: null, status, created_at: ago(20 * D) })
export const projects = [
  project('p1', 'Частный дом, Виймси', 'Виймси, Рандвере теэ 12'),
  project('p2', 'Квартира, Каламая', 'Таллин, Вана-Каламая 8-4'),
  project('p3', 'Склад, Раэ', 'Юри, Аавику 3'),
  project('p4', 'Сауна, Харку', 'Харку, Метса 5'),
  project('p5', 'Дом, Сауэ', 'Сауэ, Каре 14', 'paused'),
]
const PROGRESS = { p1: [100, 100, 60, 40, 10, 0, 0], p2: [100, 100, 100, 100, 70, 50, 20], p3: [100, 30, 0, 0, 0, 0, 0], p4: [0, 0, 0, 0, 0, 0, 0], p5: [100, 80, 0, 0, 0, 0, 0] }
const projectStages = Object.entries(PROGRESS).flatMap(([pid, list]) =>
  list.map((progress_percent, i) => ({
    id: `${pid}-s${i}`, project_id: pid, stage_template_id: `t${i}`, progress_percent, updated_at: ago(40 * D), updated_by: null,
    stage_templates: { name: TEMPLATES[i], sort_order: i + 1 },
  })),
)
const stageOf = (id) => projectStages.find((s) => s.id === id)
const hist = (id, stageId, from, to, when, by = 'u-w1') => ({
  id, project_stage_id: stageId, old_percent: from, new_percent: to, changed_by: by, changed_at: ago(when),
  project_stages: { project_id: stageOf(stageId).project_id },
})
const stageHistory = [
  hist('h1', 'p1-s2', 30, 60, 3 * H, 'u-w1'), hist('h2', 'p1-s3', 0, 40, 26 * H, 'u-w1'), hist('h3', 'p1-s1', 70, 100, 9 * D, 'u-w2'),
  hist('h4', 'p1-s4', 0, 10, 2 * H, 'u-w2'), hist('h5', 'p2-s6', 0, 20, 2 * D + 2 * H, 'u-w1'),
  hist('h6', 'p3-s1', 0, 30, 6 * D, 'u-w3'), hist('h7', 'p5-s1', 50, 80, 9 * D, 'u-w1'),
]
const photo = (id, pid, stageId, when, caption) => ({
  id, project_id: pid, project_stage_id: stageId, storage_path: `${pid}/${stageId}/${id}.jpg`, caption, uploaded_by: 'u-w1', uploaded_at: ago(when),
  project_stages: { stage_templates: { name: stageOf(stageId).stage_templates.name } },
})
const photos = [
  photo('f1', 'p1', 'p1-s2', 3 * H, 'Стропила, северная сторона'), photo('f2', 'p1', 'p1-s3', 26 * H, 'Окна, 3 из 8'),
  photo('f3', 'p1', 'p1-s2', 27 * H, null), photo('f4', 'p1', 'p1-s1', 9 * D, 'Каркас принят'),
]
const issue = (id, pid, title, priority, status, when, due) => ({
  id, project_id: pid, title, description: null, photo_path: null, priority, responsible_party: 'Поставщик', status, due_date: due, created_by: 'u-w3', created_at: ago(when),
})
const issues = [
  issue('i1', 'p1', 'Нет ПВХ-труб, доставка не пришла', 'high', 'open', 5 * H, day(1)),
  issue('i2', 'p3', 'Протекает временная кровля', 'medium', 'in_progress', 6 * D, day(3)),
  issue('i3', 'p3', 'Не хватает арматуры Ø12', 'low', 'open', 6 * D, null),
  issue('i4', 'p1', 'Мусор у ворот', 'low', 'resolved', 12 * D, null),
]
const task = (id, pid, stageId, title, assigned_to, status, due) => ({ id, project_id: pid, project_stage_id: stageId, title, assigned_to, deadline: due, status, created_by: 'u-gc', created_at: ago(3 * D) })
const tasks = [
  task('t1', 'p1', 'p1-s2', 'Закончить обрешётку', 'u-w1', 'in_progress', day(1)),
  task('t2', 'p1', 'p1-s3', 'Поставить окна на втором этаже', 'u-w1', 'todo', day(4)),
  task('t3', 'p1', 'p1-s4', 'Разводка кабеля, кухня', 'u-w2', 'todo', day(6)),
]
const accessRow = ([project_id, user_id]) => ({ project_id, user_id, project: projects.find((p) => p.id === project_id) })
const access = [['p1', 'u-w1'], ['p1', 'u-w2'], ['p2', 'u-w1'], ['p3', 'u-w3'], ['p4', 'u-w2'], ['p5', 'u-w1']].map(accessRow)

// K15 review queue (/review, only with VITE_REPORT_REVIEW=true): pending big jumps.
const report = (id, stageId, by, from, to, when, photoId) => ({
  id, project_stage_id: stageId, project_id: stageOf(stageId).project_id, reporter_id: by, previous_confirmed_percent: from, claimed_percent: to,
  status: 'pending', created_at: ago(when), projects: { name: projects.find((p) => p.id === stageOf(stageId).project_id).name },
  project_stages: { stage_templates: { name: stageOf(stageId).stage_templates.name } },
  photos: photoId ? [{ storage_path: photos.find((f) => f.id === photoId).storage_path }] : [],
})
const stageReports = [
  report('r1', 'p1-s2', 'u-w1', 30, 60, 3 * H, 'f1'), report('r2', 'p1-s3', 'u-w2', 0, 40, 26 * H, 'f2'),
  report('r3', 'p2-s6', 'u-w1', 0, 50, 5 * H, 'f3'),
]

export const TABLES = {
  profiles: Object.values(users), projects, project_stages: projectStages, stage_history: stageHistory,
  photos, issues, tasks, project_access: access, stage_reports: stageReports, companies: [{ id: 'c1', name: 'Тамм Эхитус OÜ' }, { id: 'c2', name: 'Каск OÜ' }],
}
const EXTENDED_TABLES = {
  ...TABLES,
  profiles: [...TABLES.profiles, ...Object.values(extraUsers)],
  project_access: [...access, ...extraAccess.map(accessRow)],
}

// ---------- a tiny PostgREST ----------
const get = (row, key) => key.split('.').reduce((v, k) => (Array.isArray(v) ? v[0] : v)?.[k], row)
function match(row, key, expr) {
  const [op, ...rest] = expr.split('.')
  const raw = rest.join('.')
  const v = get(row, key)
  if (op === 'eq') return String(v) === raw
  if (op === 'neq') return String(v) !== raw
  if (op === 'in') return raw.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(v))
  if (op === 'is') return raw === 'null' ? v == null : true
  return true
}
export function query(table, params, me, tables = TABLES) {
  let rows = [...(tables[table] ?? [])]
  if (table === 'projects' || table === 'project_access') {
    // what RLS would do: the empty company sees nothing of company c1
    if (me?.company_id === 'c2') rows = []
  }
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue
    rows = rows.filter((r) => match(r, k, v))
  }
  const order = params.get('order')
  if (order) {
    const [col, dir] = order.split(',')[0].split('.')
    rows.sort((a, b) => (String(get(a, col)) < String(get(b, col)) ? -1 : 1) * (dir === 'desc' ? -1 : 1))
  }
  const limit = Number(params.get('limit'))
  return limit ? rows.slice(0, limit) : rows
}

export const PHOTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#c9bfae"/><rect y="250" width="400" height="150" fill="#8d7f6b"/>
<path d="M60 250 L200 120 L340 250 Z" fill="#a0522d"/><rect x="95" y="250" width="210" height="110" fill="#e8e1d4"/>
<rect x="135" y="280" width="40" height="40" fill="#5b7083"/><rect x="225" y="280" width="40" height="40" fill="#5b7083"/></svg>`

export function jwt(user) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, role: 'authenticated', exp: Math.floor(now / 1000) + 7 * 86400 })}.fixture`
}
export function session(user) {
  const authUser = { id: user.id, aud: 'authenticated', role: 'authenticated', email: `${user.id}@example.ee`, app_metadata: {}, user_metadata: {}, created_at: ago(30 * D) }
  return { access_token: jwt(user), refresh_token: 'fixture', token_type: 'bearer', expires_in: 7 * 86400, expires_at: Math.floor(now / 1000) + 7 * 86400, user: authUser }
}

/** The fixture user for `as` (null = signed out). Unknown names get a bare id (e.g. `nocompany`). */
export function fixtureUser(as, { extended = false } = {}) {
  if (!as) return null
  const all = extended ? { ...users, ...extraUsers } : users
  return all[as] ?? { id: `u-${as}` }
}

/**
 * Seeds the session + RU locale and answers every Supabase request of a
 * browser context from the fixtures. `as`: a key of `users` (or `extraUsers`
 * with `extended`), `nocompany` (signed in, no profile), or null (signed out).
 */
export async function installFixtures(ctx, { as = null, extended = false } = {}) {
  const me = fixtureUser(as, { extended })
  const tables = extended ? EXTENDED_TABLES : TABLES
  await ctx.addInitScript(([key, value]) => {
    try {
      localStorage.setItem('buildproof.locale', 'ru')
      if (value) localStorage.setItem(key, value)
    } catch {}
  }, [STORAGE_KEY, me ? JSON.stringify(session(me)) : null])
  await ctx.route(`${SUPA}/**`, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.startsWith('/auth/v1/user')) return me ? json(session(me).user) : json({ message: 'no session' }, 401)
    if (url.pathname.startsWith('/auth/v1/')) return json({})
    if (url.pathname.startsWith('/storage/v1/object/sign/') && req.method() === 'POST') {
      const { paths = [] } = req.postDataJSON() ?? {}
      return json(paths.map((p) => ({ path: p, signedURL: `/object/sign/project-photos/${p}?token=fixture`, error: null })))
    }
    if (url.pathname.startsWith('/storage/v1/object/')) return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: PHOTO_SVG })
    if (url.pathname.startsWith('/rest/v1/rpc/')) return json(null)
    if (url.pathname.startsWith('/rest/v1/')) {
      if (req.method() !== 'GET' && req.method() !== 'HEAD') return json([])
      const table = url.pathname.split('/')[3]
      let rows = query(table, url.searchParams, me, tables)
      if (table === 'profiles' && as === 'nocompany') rows = []
      const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
      if (single) return rows.length ? json(rows[0]) : json({ code: 'PGRST116', message: 'no rows' }, 406)
      return json(rows)
    }
    return json({})
  })
  return me
}

/** First local Chrome / Edge, or CHROME_PATH. */
export async function findChrome() {
  const { existsSync } = await import('node:fs')
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  return candidates.find((p) => existsSync(p)) ?? null
}
