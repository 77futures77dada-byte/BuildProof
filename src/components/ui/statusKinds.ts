/**
 * The 13 status shapes of docs/design/02-type.md §8 — the only source of their
 * form. One shape = one meaning. Always `aria-hidden`: the word next to it
 * (colour `--fg`) carries the meaning.
 */
export const STATUS_KINDS = [
  'accepted', 'pending', 'verified', 'returned', 'sending', 'queued', 'unknown',
  'sent', 'stale', 'noreports', 'outdated', 'error', 'paused',
] as const
export type StatusKind = (typeof STATUS_KINDS)[number]

/** Icon colour per kind (02-type §8); also the chip edge colour. */
export const STATUS_COLOR: Record<StatusKind, string> = {
  accepted: 'var(--fg)',
  pending: 'var(--pending-ink)',
  verified: 'var(--ok-ink)',
  returned: 'var(--stale-ink)',
  sending: 'var(--fg)',
  queued: 'var(--warn-border)',
  unknown: 'var(--fg)',
  sent: 'var(--fg)',
  stale: 'var(--stale-ink)',
  noreports: 'var(--stale-ink)',
  outdated: 'var(--fg)',
  error: 'var(--stale-ink)',
  paused: 'var(--fg)',
}
