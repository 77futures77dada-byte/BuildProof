import { LEGAL, isPlaceholder } from '../config/legal'

/**
 * E-mail gate (03 §0.2 `gate-open` / `gate-closed`). Everything that needs a
 * letter from us — sign-in by code, password reset, invitations, sign-up —
 * is shown only when the build sets VITE_EMAIL_GATE_OPEN=true. It is opened
 * only after K34: the Supabase templates carry {{ .Token }} and were checked
 * on staging. Default: closed (password sign-in only).
 */
export function isEmailGateOpen(env: Record<string, unknown> = import.meta.env): boolean {
  return env.VITE_EMAIL_GATE_OPEN === 'true'
}

/** Filled contact parts of src/config/legal.ts; each part only when it is not a placeholder. */
export function legalContact(): { phone: string | null; email: string | null } {
  return {
    phone: isPlaceholder(LEGAL.phone) ? null : LEGAL.phone,
    email: isPlaceholder(LEGAL.email) ? null : LEGAL.email,
  }
}
