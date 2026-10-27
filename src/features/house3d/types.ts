export interface HouseStage {
  key: string
  name: string
  percent: number
  sortOrder?: number
  /** ISO timestamp, passed only when the caller already has it loaded. */
  updatedAt?: string
}
export const STAGE_PARTS = ['foundation', 'frame', 'roof', 'windows', 'electric', 'plumbing', 'finish'] as const
export type StagePart = typeof STAGE_PARTS[number]
export type HousePart = StagePart | 'handover' | 'other'
export interface MappedStage extends HouseStage { part: HousePart; percent: number }
export interface HouseRendererSnapshot { geometries: number; textures: number; programs: number }

export const isStagePart = (part: HousePart): part is StagePart => (STAGE_PARTS as readonly string[]).includes(part)
