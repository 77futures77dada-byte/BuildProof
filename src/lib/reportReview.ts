/**
 * K15 flag (03 §0.2 `k15-on` / `k15-off`): report statuses and the review
 * queue `/review`. Default off — the DB contract (docs/contracts/reports.md:
 * `stage_reports.status`, `review_stage_report`) is not deployed yet.
 */
export function isReportReviewOn(env: Record<string, unknown> = import.meta.env): boolean {
  return env.VITE_REPORT_REVIEW === 'true'
}

/** Undo window of a confirmation in the queue (brief §2.3 П1). */
export const UNDO_WINDOW_MS = 7000
