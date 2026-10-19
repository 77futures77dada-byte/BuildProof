import type { HousePart, HouseStage, MappedStage } from './types'

const byName: Record<string, HousePart> = {
  фундамент: 'foundation', каркас: 'frame', кровля: 'roof', окна: 'windows',
  электрика: 'electric', отделка: 'finish', сдача: 'handover',
}
const byOrder: Record<number, HousePart> = {
  1: 'foundation', 2: 'frame', 3: 'roof', 4: 'windows', 5: 'electric', 7: 'finish',
}
export function stagesToParts(stages: HouseStage[]): MappedStage[] {
  return stages.map((stage) => {
    const normalized = stage.name.trim().toLocaleLowerCase('ru').replace(/\s+/g, ' ')
    const part = byName[normalized] ?? (stage.sortOrder === undefined ? undefined : byOrder[stage.sortOrder]) ?? 'other'
    return { ...stage, part, percent: Number.isFinite(stage.percent) ? Math.max(0, Math.min(100, stage.percent)) : 0 }
  })
}
