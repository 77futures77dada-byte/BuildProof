import type { ReactNode } from 'react'

/**
 * Empty-state card: a title, numbered next steps, one main action and an
 * optional secondary line under it.
 */
export function NextSteps({
  title,
  steps,
  action,
  secondary,
}: {
  title: string
  steps: string[]
  action: ReactNode
  secondary?: ReactNode
}) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm text-slate-700">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
            >
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <div>{action}</div>
      {secondary}
    </section>
  )
}
