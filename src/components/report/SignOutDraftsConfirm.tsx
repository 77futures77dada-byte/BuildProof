import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isUnsent } from '../../lib/drafts'
import { ConfirmDialog } from '../ui'
import { useDrafts } from './useDrafts'

/**
 * `signout-drafts-confirm` (03 §6.5, 01 §3.4 rule 6). Use in the header:
 *   const guard = useSignOutGuard(user?.id, signOut)
 *   <Button onClick={guard.request}>…</Button> {guard.dialog}
 * With own unsent/editing drafts it asks first; «Остаться» is the main action.
 */
export function useSignOutGuard(userId: string | undefined, signOut: () => void | Promise<void>) {
  const { t } = useTranslation()
  const { drafts } = useDrafts()
  const [open, setOpen] = useState(false)
  const count = userId ? drafts.filter((d) => d.userId === userId && (isUnsent(d) || d.state === 'editing')).length : 0
  const request = () => {
    if (count > 0) setOpen(true)
    else void signOut()
  }
  const dialog = (
    <ConfirmDialog
      open={open}
      name="signout-drafts"
      title={t('common.signOut')}
      body={t('auth.signOutDrafts', { count })}
      primaryLabel={t('common.stay')}
      onPrimary={() => setOpen(false)}
      secondaryLabel={t('common.signOutAnyway')}
      onSecondary={() => { setOpen(false); void signOut() }}
      destructive
    />
  )
  return { request, dialog, count }
}
