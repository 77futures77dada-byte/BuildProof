import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { defaultTheme, effectivePref } from './theme'
import type { ThemePref, ThemeRole } from './theme'

// index.html sets the theme before first paint with its own copy of the rule; it must not drift.
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const inline = html.match(/<script>(try\{var p=localStorage[\s\S]*?)<\/script>/)?.[1] ?? ''
function runInline(pref: string | null, role: string | null) {
  const store: Record<string, string | null> = { 'bp-theme': pref, 'bp-theme-role': role }
  const metas = [{ content: '' }, { content: '' }]
  const doc = { documentElement: { dataset: {} as Record<string, string> }, querySelectorAll: () => metas }
  new Function('localStorage', 'document', inline)({ getItem: (k: string) => store[k] ?? null }, doc)
  return { theme: doc.documentElement.dataset.theme, meta: metas[0].content }
}

describe('index.html first-paint theme script', () => {
  it('exists', () => expect(inline).not.toBe(''))
  const roles: ThemeRole[] = ['gc', 'foreman', 'worker', 'client', null]
  const prefs: (ThemePref | null)[] = ['light', 'dark', 'system', null]
  for (const role of roles) for (const pref of prefs) {
    it(`matches theme.ts for pref=${pref} role=${role}`, () => {
      const want = effectivePref(pref, role)
      const got = runInline(pref, role ?? null)
      expect(got.theme).toBe(want === 'system' ? undefined : want)
      if (want !== 'system') expect(got.meta).toBe(want === 'dark' ? '#08213B' : '#FFFFFF')
    })
  }
})

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
