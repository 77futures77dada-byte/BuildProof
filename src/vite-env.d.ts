/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** "true" opens sign-in by code, invitations and sign-up (03 §0.2 gate-open). */
  readonly VITE_EMAIL_GATE_OPEN?: string
  /** "true" turns on K15: report statuses and the review queue /review (03 §0.2 k15-on). */
  readonly VITE_REPORT_REVIEW?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
