import { describe, expect, it } from 'vitest'
import { defaultTheme, effectivePref } from './theme'

describe('theme default by role', () => {
  it('gives people on site light and everyone else navy dark', () => {
    expect(defaultTheme('worker')).toBe('light')
    expect(defaultTheme('foreman')).toBe('light')
    expect(defaultTheme('gc')).toBe('dark')
    expect(defaultTheme('client')).toBe('dark')
    expect(defaultTheme(null)).toBe('dark')
  })

  it('lets a stored choice win over the role default', () => {
    expect(effectivePref('system', 'worker')).toBe('system')
    expect(effectivePref('dark', 'worker')).toBe('dark')
    expect(effectivePref('light', 'gc')).toBe('light')
    expect(effectivePref(null, 'worker')).toBe('light')
  })
})
