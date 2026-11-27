import { describe, expect, it } from 'vitest'
import { DISCLAIMER_FALLBACK, disclaimerKeyFor } from './disclaimer'

describe('client disclaimer key', () => {
  it('uses the API key when the locale has it', () => {
    expect(disclaimerKeyFor('client.disclaimer.other', () => true)).toBe('client.disclaimer.other')
  })
  it('falls back to the contract key for an unknown, empty or raw-text value', () => {
    expect(disclaimerKeyFor('something.unknown', () => false)).toBe(DISCLAIMER_FALLBACK)
    expect(disclaimerKeyFor('', () => true)).toBe(DISCLAIMER_FALLBACK)
    expect(disclaimerKeyFor(null, () => true)).toBe(DISCLAIMER_FALLBACK)
  })
})
