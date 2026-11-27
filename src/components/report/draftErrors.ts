import type { DraftError } from '../../lib/drafts'

/** Sheet-level message for an RPC error that keeps the sheet open (01 §3.4). */
export function draftErrorKey(e: DraftError): string {
  switch (e) {
    case 'network': return 'send.reasonNetwork'
    case 'timeout': return 'send.reasonTimeout'
    case 'auth': return 'send.reasonAuth'
    case 'forbidden': return 'errors.forbidden'
    case 'photo_required': return 'errors.photoRequired'
    case 'nothing_to_report': return 'errors.nothingToReport'
    case 'invalid_photo_path': return 'errors.invalidPhotoPath'
    case 'comment_required': return 'send.reasonComment'
    default: return 'errors.generic'
  }
}
