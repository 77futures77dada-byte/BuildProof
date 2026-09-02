/**
 * Static, non-interactive mockup of the customer overview screen for the
 * landing page. All values are illustrative demo data — nothing here touches
 * Supabase or the real ProjectDashboard.
 */

const DEMO_STAGES = [
  { name: 'Фундамент', percent: 100 },
  { name: 'Каркас', percent: 100 },
  { name: 'Кровля', percent: 90 },
  { name: 'Окна', percent: 70 },
  { name: 'Электрика', percent: 45 },
  { name: 'Сантехника', percent: 30 },
  { name: 'Отделка', percent: 10 },
]

const DEMO_TABS = ['Обзор', 'Этапы', 'Фото', 'Задачи', 'Проблемы']

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-sky-600" style={{ width: `${percent}%` }} />
    </div>
  )
}

export function DashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mx-auto w-full max-w-sm select-none overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-sm font-semibold text-slate-900">BuildProof</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          демо
        </span>
      </div>

      <div className="border-b border-slate-100 px-4 py-2">
        <p className="text-[15px] font-semibold text-slate-900">ЖК «Северный», корпус 3</p>
        <p className="text-xs text-slate-500">г. Тюмень, ул. Мельникайте, 12</p>
      </div>

      <div className="flex gap-1 overflow-hidden border-b border-slate-100 px-2 text-[11px]">
        {DEMO_TABS.map((tab, i) => (
          <span
            key={tab}
            className={`whitespace-nowrap border-b-2 px-1.5 py-2 ${
              i === 0
                ? 'border-sky-600 font-medium text-sky-700'
                : 'border-transparent text-slate-400'
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Общая готовность</span>
            <span className="text-xl font-semibold text-slate-900">64%</span>
          </div>
          <div className="mt-2">
            <Bar percent={64} />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Последнее обновление: сегодня в 14:32
          </p>
        </div>

        <div className="space-y-2">
          {DEMO_STAGES.map((stage) => (
            <div key={stage.name} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">{stage.name}</span>
                <span className="tabular-nums text-slate-400">{stage.percent}%</span>
              </div>
              <Bar percent={stage.percent} />
            </div>
          ))}
        </div>

        <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-slate-500">Активные проблемы</p>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-slate-700">
              Трещина в стяжке, 2 этаж
            </span>
            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">
              Высокий
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-slate-700">
              Не завезли витражи по оси Г
            </span>
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              Средний
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
