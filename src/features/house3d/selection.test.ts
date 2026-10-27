import { describe, expect, it } from 'vitest'
import { initialSelection, selectionReducer } from './selection'

describe('selection reducer', () => {
  it('starts with nothing selected', () => {
    expect(initialSelection.selected).toBeNull()
  })

  it('selects a stage', () => {
    expect(selectionReducer(initialSelection, { type: 'toggle', part: 'windows' }).selected).toBe('windows')
  })

  it('deselects on a repeated click on the same stage', () => {
    const selected = selectionReducer(initialSelection, { type: 'toggle', part: 'roof' })
    expect(selectionReducer(selected, { type: 'toggle', part: 'roof' }).selected).toBeNull()
  })

  it('switches directly to another stage', () => {
    const selected = selectionReducer(initialSelection, { type: 'toggle', part: 'roof' })
    expect(selectionReducer(selected, { type: 'toggle', part: 'electric' }).selected).toBe('electric')
  })

  it('clears on Esc / background tap and keeps the same object when already empty', () => {
    const selected = selectionReducer(initialSelection, { type: 'toggle', part: 'plumbing' })
    expect(selectionReducer(selected, { type: 'clear' }).selected).toBeNull()
    expect(selectionReducer(initialSelection, { type: 'clear' })).toBe(initialSelection)
  })
})
