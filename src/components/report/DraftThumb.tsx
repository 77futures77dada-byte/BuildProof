import { useEffect, useMemo } from 'react'

/** 48 × 48 thumbnail of a draft photo (tells two drafts of one stage apart). */
export function DraftThumb({ photo }: { photo: Blob | null }) {
  const url = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return (
    <span aria-hidden="true" className="block size-12 shrink-0 overflow-hidden rounded-chip border-2 border-line bg-surface">
      {url ? <img src={url} alt="" className="block size-full object-cover" /> : null}
    </span>
  )
}
