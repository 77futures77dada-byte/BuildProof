import { describe, expect, it } from 'vitest'
import { stageFromParam } from './stageParam'

describe('stageFromParam', () => {
  const stages = [{ id: 's1' }, { id: 's2' }]
  it('takes a stage of this project', () => expect(stageFromParam('s2', stages)).toBe('s2'))
  it('ignores a missing or foreign stage', () => {
    expect(stageFromParam(null, stages)).toBeNull()
    expect(stageFromParam('other', stages)).toBeNull()
  })
})
