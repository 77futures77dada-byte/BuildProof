/**
 * Company and data-processing facts shown in the landing footer and the
 * "Ваши данные" block.
 *
 * Every value still in [square brackets] is a placeholder that a person has to
 * fill in (buildproof-decisions.md §6). `scripts/check-placeholders.mjs` runs
 * before `npm run build` and fails the build while any remain; set
 * ALLOW_PLACEHOLDERS=1 for preview builds.
 */

export const LEGAL = {
  /** The person behind the product, shown in the hero and footer. */
  founderName: '[Имя Фамилия]',
  phone: '[телефон]',
  email: '[почта]',
  companyName: '[Название OÜ]',
  registryCode: '[код]',
  /** Estonian VAT number (KMKR). */
  vatNumber: '[номер]',
  /** Where photos and the database are stored, e.g. "Supabase, Frankfurt (DE)". */
  hosting: '[провайдер, страна — заполнить]',
  /** Transactional e-mail provider and country. */
  emailProvider: '[провайдер, страна]',
  /** Analytics provider, or "нет". */
  analytics: '[провайдер или «нет»]',
  /** When the DPA will be ready (it is "по запросу" until then). */
  dpaTimeline: '[срок]',
} as const

export type LegalKey = keyof typeof LEGAL

/** True while a value is still an unfilled [placeholder]. */
export const isPlaceholder = (value: string) => /^\[.*\]$/.test(value)
