export interface HouseStage { key: string; name: string; percent: number; sortOrder?: number }
export type HousePart = 'foundation' | 'frame' | 'roof' | 'windows' | 'electric' | 'finish' | 'handover' | 'other'
export interface MappedStage extends HouseStage { part: HousePart; percent: number }
export interface HouseRendererSnapshot { geometries: number; textures: number; programs: number }
