import type { ReactNode } from 'react'

/** Single centered card on a full-height ground — used for auth/edge screens. */
export function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-page p-4">
      <div className="w-full max-w-sm space-y-4 rounded-card border-2 border-line bg-surface p-6 text-center shadow-card">
        {children}
      </div>
    </div>
  )
}
