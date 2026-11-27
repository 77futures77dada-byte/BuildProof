/**
 * K15 flag (03 §0.2 `k15-on` / `k15-off`): report statuses and the review
 * queue `/review`. Default on: the DB contract is deployed (migrations 006/007:
 * `stage_reports.status`, `review_stage_report` for owner and foreman).
 * `VITE_REPORT_REVIEW=false` turns it off.
 */
export function isReportReviewOn(env: Record<string, unknown> = import.meta.env): boolean {
  return env.VITE_REPORT_REVIEW !== 'false'
}

/** Undo window of a confirmation in the queue (brief §2.3 П1). */
export const UNDO_WINDOW_MS = 7000

/**
 * «было X%, заявлено Y%» of a pending report. Worker-link reports carry
 * `previous_confirmed_percent` / `claimed_percent`; account reports only
 * `old_percent` / `new_percent` (submit_stage_report leaves the first pair null).
 */
export function queuePercents(r: {
  old_percent?: number | null
  new_percent?: number | null
  previous_confirmed_percent?: number | null
  claimed_percent?: number | null
}): { from: number; to: number } {
  return {
    from: r.previous_confirmed_percent ?? r.old_percent ?? 0,
    to: r.claimed_percent ?? r.new_percent ?? 0,
  }
}
