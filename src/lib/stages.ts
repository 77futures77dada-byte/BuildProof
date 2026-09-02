import { supabase } from './supabaseClient'

/**
 * Set a stage's progress. The Postgres function `update_stage_progress` updates
 * `project_stages` and writes the `stage_history` row in one transaction — the
 * frontend never touches those tables directly.
 */
export async function updateStageProgress(
  projectStageId: string,
  newPercent: number,
): Promise<void> {
  const { error } = await supabase.rpc('update_stage_progress', {
    p_project_stage_id: projectStageId,
    p_new_percent: newPercent,
  })
  if (error) throw error
}

/** Progress values are whole percentages on a 0..100 scale, stepped by 5. */
export const PROGRESS_STEP = 5
export const PROGRESS_MIN = 0
export const PROGRESS_MAX = 100

/** Clamp to [0, 100] and snap to the nearest multiple of PROGRESS_STEP. */
export function snapProgress(value: number): number {
  const clamped = Math.max(PROGRESS_MIN, Math.min(PROGRESS_MAX, value))
  return Math.round(clamped / PROGRESS_STEP) * PROGRESS_STEP
}
