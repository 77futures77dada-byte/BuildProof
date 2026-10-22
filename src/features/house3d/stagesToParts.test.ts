import { describe, expect, it } from 'vitest'
import { stagesToParts } from './stagesToParts'
import type { HouseStage } from './types'

const stage = (key: string, name: string, percent: number): HouseStage => ({ key, name, percent })

describe('stagesToParts', () => {
  it('maps zero, partial, and complete progress to known parts', () => {
    expect(stagesToParts([stage('a',' ФУНДАМЕНТ ',0),stage('b','Каркас',50),stage('c','Кровля',100)]))
      .toMatchObject([{part:'foundation',percent:0},{part:'frame',percent:50},{part:'roof',percent:100}])
  })
  it('keeps unknown stages as other and handles empty input', () => {
    expect(stagesToParts([stage('x','Неизвестный этап',40)])[0].part).toBe('other')
    expect(stagesToParts([])).toEqual([])
  })
  it('uses sort order when the stage name is not recognized', () => {
    expect(stagesToParts([{...stage('x','Неизвестный этап',40),sortOrder:2}])[0].part).toBe('frame')
  })
  it('normalizes the miscellaneous template name and maps its sort order', () => {
    expect(stagesToParts([stage('misc',' \\u041f\\u0420\\u041e\\u0427\\u0415\\u0415 ',40)])[0].part).toBe('other')
    expect(stagesToParts([stage('misc2','\\u041f\\u0440\\u043e\\u0447\\u0438\\u0435 \\u0440\\u0430\\u0431\\u043e\\u0442\\u044b',40)])[0].part).toBe('other')
    expect(stagesToParts([{...stage('misc3','custom name',40),sortOrder:8}])[0].part).toBe('other')
  })
  it('clamps out-of-range percentages', () => {
    expect(stagesToParts([stage('a','Фундамент',-4),stage('b','Каркас',120)]).map(s=>s.percent)).toEqual([0,100])
  })
})
