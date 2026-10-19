export interface HouseStage { key: string; name: string; percent: number; sortOrder?: number }
export type HousePart = 'foundation' | 'frame' | 'roof' | 'windows' | 'electric' | 'finish' | 'handover' | 'other'
export interface MappedStage extends HouseStage { part: HousePart; percent: number }
