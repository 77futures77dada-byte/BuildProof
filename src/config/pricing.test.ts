import { describe, expect, it } from 'vitest'
import { PRICING, monthlyPriceEur, priceTable, proratedPriceEur } from './pricing'

describe('pricing', () => {
  it('charges per object up to the cap', () => {
    expect(monthlyPriceEur(0)).toBe(0)
    expect(monthlyPriceEur(1)).toBe(29)
    expect(monthlyPriceEur(3)).toBe(87)
    expect(monthlyPriceEur(4)).toBe(PRICING.capEur)
    expect(monthlyPriceEur(10)).toBe(99)
  })

  it('prorates a short object by calendar days', () => {
    // Landing example: bathroom renovation, 3 weeks ≈ 20 €.
    expect(Math.round(proratedPriceEur(21))).toBe(20)
    expect(proratedPriceEur(30)).toBe(29)
    expect(proratedPriceEur(0)).toBe(0)
  })

  it('builds the static table with the capped last row', () => {
    expect(priceTable()).toEqual([
      { objects: 1, capped: false, eur: 29 },
      { objects: 2, capped: false, eur: 58 },
      { objects: 3, capped: false, eur: 87 },
      { objects: 4, capped: true, eur: 99 },
    ])
  })
})
