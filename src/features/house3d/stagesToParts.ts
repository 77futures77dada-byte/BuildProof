import type { HousePart, HouseStage, MappedStage } from './types'

const byName: Record<string, HousePart> = {
  '\u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442': 'foundation',
  '\u043a\u0430\u0440\u043a\u0430\u0441': 'frame',
  '\u043a\u0440\u043e\u0432\u043b\u044f': 'roof',
  '\u043e\u043a\u043d\u0430': 'windows',
  '\u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430': 'electric',
  '\u043e\u0442\u0434\u0435\u043b\u043a\u0430': 'finish',
  '\u0441\u0434\u0430\u0447\u0430': 'handover',
  '\u043f\u0440\u043e\u0447\u0435\u0435': 'other',
  '\u043f\u0440\u043e\u0447\u0438\u0435 \u0440\u0430\u0431\u043e\u0442\u044b': 'other',
}
const byOrder: Record<number, HousePart> = { 1: 'foundation', 2: 'frame', 3: 'roof', 4: 'windows', 5: 'electric', 7: 'finish', 8: 'other' }
export function stagesToParts(stages: HouseStage[]): MappedStage[] {
  return stages.map(stage => {
    const normalized = stage.name.trim().toLocaleLowerCase('ru').replace(/\s+/g, ' ')
    const part = byName[normalized] ?? (stage.sortOrder === undefined ? undefined : byOrder[stage.sortOrder]) ?? 'other'
    return { ...stage, part, percent: Number.isFinite(stage.percent) ? Math.max(0, Math.min(100, stage.percent)) : 0 }
  })
}
