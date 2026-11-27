import { useEffect } from 'react'

const TAGS: [string, string][] = [
  ['robots', 'noindex,nofollow'],
  ['referrer', 'no-referrer'],
]

/**
 * Link pages (/w, /c) are private: no indexing, and no Referer on photo or
 * other requests leaving the page. Set in <head> while the page is mounted
 * (an HTTP header in vercel.json would cover the first request as well).
 */
export function useLinkPageMeta(): void {
  useEffect(() => {
    const added = TAGS.map(([name, content]) => {
      const m = document.createElement('meta')
      m.name = name
      m.content = content
      m.dataset.linkPage = ''
      document.head.prepend(m)
      return m
    })
    return () => { for (const m of added) m.remove() }
  }, [])
}
