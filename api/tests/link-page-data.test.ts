import assert from 'node:assert/strict'
import test from 'node:test'
import { contractorContact, visibilityByStage, withProjectName, withReportCounts } from '../lib/link-page-data.ts'

test('worker stages include the project title field without changing stage data', () => {
  assert.deepEqual(withProjectName({ project_id: 'p1', stages: [] },'Object name'), {
    project_id: 'p1', project_name: 'Object name', stages: [],
  })
})

test('worker link listing reports exact counts and zero for an empty link', () => {
  assert.deepEqual(withReportCounts([{ id: 'link-1' },{ id: 'link-2' }],[{ id: 'link-1', count: 3 }]), [
    { id: 'link-1', report_count: 3 },{ id: 'link-2', report_count: 0 },
  ])
})

test('visibility settings include hidden defaults and keep photo consent separate', () => {
  assert.deepEqual(visibilityByStage([{ id: 'stage-1' },{ id: 'stage-2' }],[
    { project_stage_id: 'stage-1', visible: true, photos_visible: false },
  ]), {
    'stage-1': { visible: true, photos: false },
    'stage-2': { visible: false, photos: false },
  })
})

test('contractor contact returns only existing profile/account fields and null when absent', () => {
  assert.deepEqual(contractorContact({ full_name: '  Owner  ' },{ email: 'owner@example.test', phone: '' }), {
    name: 'Owner', email: 'owner@example.test', phone: null,
  })
  assert.deepEqual(contractorContact(null,null), { name: null, email: null, phone: null })
})
