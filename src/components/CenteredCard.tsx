import type { ReactNode } from 'react'

/** Single centered card on a full-height ground — used for auth/edge screens. */
export function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {children}
      </div>
    </div>
  )
}
