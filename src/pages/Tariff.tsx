import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppHeader } from '../components/AppHeader'
import { AppLoading } from '../components/AppLoading'
import { buttonClass, cx } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { founderName, legalContact } from '../lib/emailGate'
import { PRICING, priceTable } from '../config/pricing'

/**
 * 03 §4.6 «Тариф» (gc only): only the owner's decisions — price, the table with
 * the cap row, the trial, «оплаты в приложении нет». The billing-days rule
 * waits for K19; `tariff.included` / `tariff.invoice` are not shown. Main
 * action «Написать о продолжении» only when legal.ts has an e-mail; «К
 * объектам» is always there. Without a contact the cap row does not promise
 * «по договорённости».
 */
export function Tariff() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const p = PRICING
  const { email } = legalContact()

  if (!profile) return <AppLoading />
  if (profile.role !== 'gc') return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-svh bg-page text-fg">
      <AppHeader />

      <main className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-6 lg:grid lg:grid-cols-[560px_1fr] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h1 className="m-0 text-h1 text-fg">{t('tariff.title')}</h1>
          <p className="m-0 text-field text-fg">{t('tariff.lead', { price: p.perObjectEur })}</p>
        </div>

        <table className="w-full border-separate border-spacing-0 text-left text-body">
          <thead>
            <tr>
              <th scope="col" className="border-b-2 border-line px-3 py-3 font-medium">{t('tariff.colObjects')}</th>
              <th scope="col" className="border-b-2 border-line px-3 py-3 text-right font-medium">{t('tariff.colPrice')}</th>
            </tr>
          </thead>
          <tbody>
            {priceTable().map((row) => (
              <tr key={row.objects}>
                <td className={cx('px-3 py-3 align-top', row.capped ? 'rounded-l-control border-y-2 border-l-2 border-fg' : 'border-b-2 border-line')}>
                  {row.capped ? t(email ? 'tariff.capRow' : 'tariff.capRowNoContact', { from: row.objects, max: p.capMaxObjects }) : t('tariff.objects', { count: row.objects })}
                </td>
                <td className={cx('px-3 py-3 text-right align-top whitespace-nowrap', row.capped ? 'rounded-r-control border-y-2 border-r-2 border-fg' : 'border-b-2 border-line')}>
                  <span className="num-col text-h3">{row.eur} €</span>
                  {row.capped ? <span className="block font-medium">{t('tariff.capNote', { eur: p.capEur })}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-4">
          <p className="m-0 text-body text-fg">{t('tariff.trial', { days: p.trialDays })}</p>
          <p className="m-0 rounded-card bg-surface p-4 text-body text-fg">{t('tariff.noBilling')}</p>
          {founderName() ? <p className="m-0 text-body text-fg">{t('auth.madeBy', { name: founderName() })}</p> : null}
          {email ? (
            <a href={`mailto:${email}`} data-main="" className={buttonClass({ variant: 'primary', block: true })}>
              {t('tariff.contact')}
            </a>
          ) : null}
          <Link to="/dashboard" className={buttonClass({ variant: 'secondary', block: true })}>
            {t('tariff.toProjects')}
          </Link>
        </div>
      </main>
    </div>
  )
}
