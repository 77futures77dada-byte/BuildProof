import assert from 'node:assert/strict'
import test from 'node:test'
import { exportCsv } from '../company-export.ts'

test('company export CSV emits typed rows and escapes JSON fields', () => {
  const csv = exportCsv({
    company: { id: 'company-1', name: 'Firm, Inc' },
    projects: [{
      project: { id: 'project-1', name: 'House "A"' },
      stages: [{ id: 'stage-1', progress_percent: 50 }],
      reports: [{ report: { id: 'report-1', status: 'pending' }, history: [{ id: 'history-1' }], photos: [] }],
      history: [], issues: [{ id: 'issue-1' }], tasks: [{ id: 'task-1' }], photos: [{ id: 'photo-1', url: 'https://signed.test/p' }],
    }],
  })
  assert.match(csv, /^record_type,project_id,record_id,payload/)
  assert.match(csv, /"project","project-1","project-1"/)
  assert.ok(csv.includes('""name"":""House'))
  assert.match(csv, /"report","project-1","report-1"/)
  assert.match(csv, /"photo","project-1","photo-1"/)
})
