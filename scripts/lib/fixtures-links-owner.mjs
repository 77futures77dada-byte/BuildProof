// Owner-side link API mocks for /project/:id/links and the review queue names.
// Wire after installFixtures(ctx, { as: 'gc' }): installLinksOwnerMocks(ctx, { empty: false }).
// The fake token is a fixture constant, not a secret.

const D = 86400e3
const now = Date.parse('2026-11-27T10:00:00Z')
const iso = (ms) => new Date(ms).toISOString()

const link = (id, project_id, display_name, { created = 10, expires = 20, revoked = null, used = null } = {}) => ({
  id, project_id, display_name, created_at: iso(now - created * D), expires_at: iso(now + expires * D),
  revoked_at: revoked === null ? null : iso(now - revoked * D), last_used_at: used === null ? null : iso(now - used * D),
})

const WORKER_LINKS = [
  link('wl1', 'p1', 'Андрес Тамм', { used: 0.1 }),
  link('wl2', 'p1', 'Марко Сепп — очень длинное имя бригадира для проверки переноса строки', { expires: 2 }),
  link('wl3', 'p1', 'Юри', { created: 40, expires: -5, used: 12 }),
  link('wl4', 'p1', 'Пеэтер', { revoked: 3, used: 6 }),
]
const CLIENT_LINKS = [link('cl1', 'p1', 'Семья Кукк', { used: 1 })]

const PREVIEW = {
  project_id: 'p1', project_name: 'Дом Кукк, Виймси', disclaimer: 'client.disclaimer.percentNotPayment',
  stages: [
    { stage_id: 'p1-s1', name: 'Фундамент', confirmed_percent: 100, updated_at: iso(now - 9 * D), photos: [{ path: 'p1/f1.jpg', url: '/storage/v1/object/sign/project-photos/p1/f1.jpg?token=fixture' }] },
    { stage_id: 'p1-s2', name: 'Кровля', confirmed_percent: 40, updated_at: iso(now - D), photos: [] },
  ],
}

/** opts.empty: no links and an empty preview; opts.fail: every call answers 500 link_list_failed. */
export async function installLinksOwnerMocks(ctx, { empty = false, fail = false } = {}) {
  const store = { worker: empty ? [] : [...WORKER_LINKS], client: empty ? [] : [...CLIENT_LINKS] }
  const preview = empty ? { ...PREVIEW, stages: [] } : PREVIEW
  let seq = 0
  const handle = (kind) => async (route) => {
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (fail) return json({ error: 'link_list_failed' }, 500)
    const body = route.request().postDataJSON() ?? {}
    if (body.action === 'list') return json({ links: store[kind].filter((l) => l.project_id === body.project_id) })
    if (body.action === 'revoke') {
      const row = store[kind].find((l) => l.id === body.link_id)
      if (!row) return json({ error: 'link_not_found' }, 404)
      row.revoked_at = iso(now)
      return json({ revoked: true })
    }
    if (body.action === 'create') {
      seq += 1
      const id = `${kind[0]}l-new-${seq}`
      const row = { id, project_id: body.project_id, display_name: body.display_name, created_at: iso(now), expires_at: body.expires_at, revoked_at: null, last_used_at: null }
      store[kind].unshift(row)
      return json({ link_id: id, token: `fixture-token-${kind}-${seq}-AAAAAAAAAAAAAAAAAAAAAAAAAAAA`, display_name: row.display_name, expires_at: row.expires_at }, 201)
    }
    return json({ error: 'invalid_action' }, 400)
  }
  await ctx.route('**/api/worker-links', handle('worker'))
  await ctx.route('**/api/client-links', handle('client'))
  await ctx.route('**/api/client-visibility', (route) =>
    route.fulfill({ status: fail ? 500 : 200, contentType: 'application/json', body: JSON.stringify(fail ? { error: 'visibility_update_failed' } : { updated: true }) }))
  await ctx.route('**/api/client-view', (route) =>
    route.fulfill({ status: fail ? 404 : 200, contentType: 'application/json', body: JSON.stringify(fail ? { error: 'project_not_found' } : preview) }))
  return store
}
