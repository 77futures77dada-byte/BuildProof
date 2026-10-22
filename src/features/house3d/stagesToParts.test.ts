import { describe, expect, it } from 'vitest'
import { stagesToParts } from './stagesToParts'
import type { HouseStage } from './types'

const names = [
  '\u0424\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442',
  '\u041a\u0430\u0440\u043a\u0430\u0441',
  '\u041a\u0440\u043e\u0432\u043b\u044f',
  '\u041e\u043a\u043d\u0430',
  '\u042d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430',
  '\u0421\u0430\u043d\u0442\u0435\u0445\u043d\u0438\u043a\u0430',
  '\u041e\u0442\u0434\u0435\u043b\u043a\u0430',
]
const parts = ['foundation','frame','roof','windows','electric','plumbing','finish']
const stage = (name: string, percent: number, sortOrder?: number): HouseStage => ({ key: name, name, percent, ...(sortOrder === undefined ? {} : { sortOrder }) })

describe('stagesToParts', () => {
  it('maps all seven catalogue names after case, whitespace and ё/е normalization', () => {
    const mapped = stagesToParts(names.map(name => stage(`  ${name.toLocaleUpperCase('ru').replace(/Е/g, 'Ё')}  `, 100)))
    expect(mapped.map(item => item.part)).toEqual(parts)
    expect(mapped.map(item => item.percent)).toEqual([100,100,100,100,100,100,100])
  })

  it('uses the catalogue sort_order fallback when names are empty', () => {
    expect(stagesToParts(parts.map((_part, index) => stage('', 0, index + 1))).map(item => item.part)).toEqual(parts)
  })

  it('keeps unknown stages as other and retains their actual label', () => {
    const [unknown] = stagesToParts([stage('Нестандартный этап', 40)])
    expect(unknown.part).toBe('other')
    expect(unknown.name).toBe('Нестандартный этап')
  })

  it('maps every 100% stage as complete and clamps percentages', () => {
    expect(stagesToParts(names.map(name => stage(name, 100))).every(item => item.percent === 100)).toBe(true)
    expect(stagesToParts([stage(names[0], -4), stage(names[1], 120)]).map(item => item.percent)).toEqual([0,100])
  })
})
