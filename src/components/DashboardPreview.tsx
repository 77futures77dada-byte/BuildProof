import { useTranslation } from 'react-i18next'

/**
 * Static, non-interactive mockup of the customer overview screen for the
 * landing page. All values are illustrative demo data — nothing here touches
 * Supabase or the real ProjectDashboard.
 */

const DEMO_STAGES = [
  { key: 'foundation', percent: 100 },
  { key: 'frame', percent: 100 },
  { key: 'roof', percent: 90 },
  { key: 'windows', percent: 70 },
  { key: 'electrical', percent: 45 },
  { key: 'plumbing', percent: 30 },
  { key: 'finishing', percent: 10 },
]

const DEMO_TABS = ['overview', 'stages', 'photos', 'tasks', 'issues']

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-sky-600" style={{ width: `${percent}%` }} />
    </div>
  )
}

export function DashboardPreview() {
  const { t } = useTranslation()
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mx-auto w-full max-w-sm select-none overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-sm font-semibold text-slate-900">BuildProof</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {t('demo.badge')}
        </span>
      </div>

      <div className="border-b border-slate-100 px-4 py-2">
        <p className="text-[15px] font-semibold text-slate-900">{t('demo.projectName')}</p>
        <p className="text-xs text-slate-500">{t('demo.address')}</p>
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
            {t(`nav.${tab}`)}
          </span>
        ))}
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">{t('demo.overall')}</span>
            <span className="text-xl font-semibold text-slate-900">64%</span>
          </div>
          <div className="mt-2">
            <Bar percent={64} />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{t('demo.lastUpdate')}</p>
        </div>

        <div className="space-y-2">
          {DEMO_STAGES.map((stage) => (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">{t(`stageTemplates.${stage.key}`)}</span>
                <span className="tabular-nums text-slate-400">{stage.percent}%</span>
              </div>
              <Bar percent={stage.percent} />
            </div>
          ))}
        </div>

        <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-slate-500">{t('demo.activeIssues')}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-slate-700">{t('demo.issue1')}</span>
            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">
              {t('issuePriority.high')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-slate-700">{t('demo.issue2')}</span>
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              {t('issuePriority.medium')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
