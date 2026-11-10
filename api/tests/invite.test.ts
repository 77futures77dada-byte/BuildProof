import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInviteHandler } from '../invite.ts'

const callerId = '10000000-0000-4000-8000-000000000001'
const projectId = '20000000-0000-4000-8000-000000000001'

function harness(role: string, companyId = '30000000-0000-4000-8000-000000000001') {
  const profile = { id: callerId, company_id: companyId, role }
  const fakeFactory = ((_url: string, key: string) => {
    if (key === 'anon-key') return {
      auth: { getUser: async () => ({ data: { user: { id: callerId } }, error: null }) },
      from: (_table: string) => ({
        select: () => {
          const query = {
            eq: () => query,
            maybeSingle: async () => ({ data: profile, error: null }),
            in: async (_column: string, _ids: string[]) => ({ data: [], error: null }),
          }
          return query
        },
      }),
    }
    return {}
  }) as never
  const handler = createInviteHandler(fakeFactory)
  const response = {
    code: 0,
    body: undefined as unknown,
    status(code: number) { this.code = code; return this },
    json(body: unknown) { this.body = body },
  }
  return { handler, response }
}

test('missing bearer token returns 401', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  process.env.SITE_URL = 'https://example.test'
  const { handler, response } = harness('gc')
  await handler({ method: 'POST', headers: {} }, response)
  assert.equal(response.code, 401)
})

test('worker returns 403', async () => {
  const { handler, response } = harness('worker')
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' }, body: {} }, response)
  assert.equal(response.code, 403)
})

test('gc cannot invite a user to a foreign project', async () => {
  const { handler, response } = harness('gc')
  await handler({
    method: 'POST', headers: { authorization: 'Bearer valid-token' },
    body: { email: 'new@example.test', full_name: 'New User', role: 'worker', project_ids: [projectId] },
  }, response)
  assert.equal(response.code, 403)
})
