import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { PRICING, priceTable } from '../config/pricing'

/**
 * "Тариф": the same rules and numbers as the landing price block, read from
 * config/pricing.ts. Informational only — there is no billing in the app yet.
 */
export function Tariff() {
  const { t } = useTranslation()
  const p = PRICING

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="text-sm font-medium text-sky-700 underline underline-offset-2">
            {t('tariff.back')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t('tariff.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('tariff.lead', { price: p.perObjectEur })}</p>
        </div>

        <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">{t('tariff.colObjects')}</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">{t('tariff.colPrice')}</th>
            </tr>
          </thead>
          <tbody>
            {priceTable().map((row) => (
              <tr key={row.objects} className={`border-t border-slate-200 ${row.capped ? 'bg-amber-50' : ''}`}>
                <td className="px-4 py-3 text-slate-800">
                  {row.capped
                    ? t('tariff.capRow', { from: row.objects, max: p.capMaxObjects, gb: p.capStorageGb })
                    : t('tariff.objects', { count: row.objects })}
                </td>
                <td className="px-4 py-3 text-right text-lg font-semibold tabular-nums text-slate-900">{row.eur} €</td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>{t('tariff.days', { divisor: p.daysPerMonth })}</li>
          <li>{t('tariff.trial', { days: p.trialDays, reminder: p.trialReminderDays })}</li>
          <li>{t('tariff.included', { managers: p.includedManagers })}</li>
          <li>{t('tariff.invoice')}</li>
        </ul>

        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">{t('tariff.noBilling')}</p>
      </main>
    </div>
  )
}
