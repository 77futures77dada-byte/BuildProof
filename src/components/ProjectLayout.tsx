import { NavLink, Outlet, useParams } from 'react-router-dom'

const TABS = [
  { to: '', label: 'Обзор', end: true },
  { to: 'stages', label: 'Этапы', end: false },
  { to: 'photos', label: 'Фото', end: false },
  { to: 'tasks', label: 'Задачи', end: false },
  { to: 'issues', label: 'Проблемы', end: false },
  { to: 'settings', label: 'Настройки', end: false },
]

/**
 * Chrome shared by every /project/:id/* screen: top bar + a horizontally
 * scrollable tab strip (foremen and workers open these on a phone).
 */
export function ProjectLayout() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/dashboard" className="text-sm font-semibold text-slate-900">
            BuildProof
          </NavLink>
        </div>
        <nav className="mx-auto max-w-5xl overflow-x-auto px-2">
          <ul className="flex min-w-max gap-1 pb-px">
            {TABS.map((tab) => (
              <li key={tab.to || 'overview'}>
                <NavLink
                  to={tab.to ? `/project/${id}/${tab.to}` : `/project/${id}`}
                  end={tab.end}
                  className={({ isActive }) =>
                    `inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
                      isActive
                        ? 'border-sky-600 font-medium text-sky-700'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
