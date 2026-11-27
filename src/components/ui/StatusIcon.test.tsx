import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { StatusIcon } from './StatusIcon'
import { STATUS_COLOR, STATUS_KINDS } from './statusKinds'

const shape = (html: string) => html.replace(/<svg[^>]*>/, '').replace(/id="[^"]*"|url\(#[^)]*\)/g, '')

describe('StatusIcon (02-type §8)', () => {
  it('has exactly the 13 kinds, each with a colour token', () => {
    expect(STATUS_KINDS).toHaveLength(13)
    for (const k of STATUS_KINDS) expect(STATUS_COLOR[k]).toMatch(/^var\(--[\w-]+\)$/)
  })

  it('renders a distinct, hidden shape per kind', () => {
    const shapes = STATUS_KINDS.map((kind) => renderToStaticMarkup(<StatusIcon kind={kind} />))
    for (const html of shapes) {
      expect(html).toContain('aria-hidden="true"')
      expect(html).toContain('viewBox="0 0 20 20"')
    }
    expect(new Set(shapes.map(shape)).size).toBe(STATUS_KINDS.length)
  })
})
