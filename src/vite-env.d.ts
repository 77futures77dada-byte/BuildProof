/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** "true" opens sign-in by code, invitations and sign-up (03 §0.2 gate-open). */
  readonly VITE_EMAIL_GATE_OPEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
