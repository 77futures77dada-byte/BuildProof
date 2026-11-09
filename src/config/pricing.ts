/**
 * Tariff, shared by the landing page and the in-app "Тариф" screen so both
 * always show the same numbers. No billing happens in the client: this only
 * describes the rules (see buildproof-decisions.md, §4 and §5.9).
 *
 * All amounts are euros excluding VAT ("+ НДС" is shown next to every price).
 */

export const PRICING = {
  /** Price of one active object for a full month. */
  perObjectEur: 29,
  /** Monthly bill never exceeds this… */
  capEur: 99,
  /** …which applies from this many active objects. */
  capFromObjects: 4,
  /** What the capped price covers; beyond either limit the price is negotiated. */
  capMaxObjects: 10,
  capStorageGb: 50,
  /** Partial months are billed per calendar day: price × days ÷ this. */
  daysPerMonth: 30,
  trialDays: 30,
  /** Reminder before the trial ends. */
  trialReminderDays: 5,
  /** Owner and manager seats included; workers and clients are always free. */
  includedManagers: 3,
} as const

/** Monthly price for `objects` active objects for the whole month, before VAT. */
export function monthlyPriceEur(objects: number): number {
  if (objects <= 0) return 0
  return Math.min(objects * PRICING.perObjectEur, PRICING.capEur)
}

/** Price of one object active for `days` calendar days (paused days excluded), before VAT. */
export function proratedPriceEur(days: number): number {
  if (days <= 0) return 0
  return (days * PRICING.perObjectEur) / PRICING.daysPerMonth
}

/** Rows of the static price table: 1, 2, 3 objects, then the capped row. */
export function priceTable(): { objects: number; capped: boolean; eur: number }[] {
  const rows = []
  for (let n = 1; n < PRICING.capFromObjects; n++) rows.push({ objects: n, capped: false, eur: monthlyPriceEur(n) })
  rows.push({ objects: PRICING.capFromObjects, capped: true, eur: PRICING.capEur })
  return rows
}
