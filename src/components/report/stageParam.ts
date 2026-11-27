/**
 * `?stage=<id>` on /project/:id/today (worker «Отметить» on «Этапы»): the stage
 * the next shot goes to, only if it exists in this project.
 */
export function stageFromParam(param: string | null, stages: { id: string }[]): string | null {
  if (!param) return null
  return stages.some((s) => s.id === param) ? param : null
}
