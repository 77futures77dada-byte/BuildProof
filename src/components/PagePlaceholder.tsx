import type { ReactNode } from 'react'

/**
 * Temporary scaffold for screens whose Supabase queries are not wired up yet.
 * Every real feature replaces this with actual data — it must never ship
 * fake numbers dressed up as real ones.
 */
export function PagePlaceholder({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
        Экран в разработке — данные ещё не подключены.
      </div>
      {children}
    </section>
  )
}
