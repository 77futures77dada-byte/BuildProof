import { useTranslation } from 'react-i18next'
import { hasLegalContact, legalContact } from '../lib/emailGate'

/**
 * BuildProof support contact from src/config/legal.ts: each part only when it
 * is filled, nothing at all otherwise (03 §0.2 `legal-filled`). `label` names
 * whose contact it is («Поддержка BuildProof»), so it is not read as the
 * firm owner's phone.
 */
export function ContactLines({ label }: { label?: string }) {
  const { t } = useTranslation()
  const { phone, email } = legalContact()
  if (!hasLegalContact()) return null
  return (
    <div className="flex flex-col">
      {label ? <p className="m-0 text-body font-semibold text-fg">{label}</p> : null}
      {phone ? (
        <a href={`tel:${phone.replace(/\s+/g, '')}`} className="inline-flex min-h-12 items-center text-body font-semibold text-fg underline underline-offset-4">
          {t('common.contactPhone', { phone })}
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className="inline-flex min-h-12 items-center text-body font-semibold text-fg underline underline-offset-4">
          {t('common.contactEmail', { email })}
        </a>
      ) : null}
    </div>
  )
}
