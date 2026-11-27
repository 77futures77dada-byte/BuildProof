import { useEffect, useState } from 'react'

/**
 * Object URLs for blobs, created and revoked inside one effect so a StrictMode
 * re-run never leaves an <img> pointing at a revoked URL.
 */
export function useObjectUrls(blobs: readonly Blob[]): string[] {
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    const made = blobs.map((b) => URL.createObjectURL(b))
    // oxlint-disable-next-line react/set-state-in-effect -- URLs belong to this effect's lifetime
    setUrls(made)
    return () => { for (const u of made) URL.revokeObjectURL(u) }
  }, [blobs])
  return urls
}
