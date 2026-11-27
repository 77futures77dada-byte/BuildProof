import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import type { ProjectStatus } from '../types'
import { ConfirmDialog } from './ui'

export type ProjectStatusAction = 'pause' | 'complete' | 'resume'

const TARGET: Record<ProjectStatusAction, ProjectStatus> = { pause: 'paused', complete: 'completed', resume: 'active' }
const LABEL: Record<ProjectStatusAction, string> = { pause: 'project.pause', complete: 'project.complete', resume: 'project.resume' }
const BODY: Record<ProjectStatusAction, string> = { pause: 'project.pauseConfirm', complete: 'project.completeConfirm', resume: 'project.resume' }

interface ProjectStatusConfirmProps {
  projectId: string
  /** Which change to confirm; null = closed. */
  action: ProjectStatusAction | null
  onClose: () => void
  /** After the row is updated (reload the project). */
  onDone: (status: ProjectStatus) => void
}

/**
 * project-status-confirm (03 §5.9), gc: main = the action, secondary «Отмена».
 * Writes `projects.status` (RLS projects_update: gc of the company).
 */
export function ProjectStatusConfirm({ projectId, action, onClose, onDone }: ProjectStatusConfirmProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function apply() {
    if (!action) return
    setBusy(true)
    setFailed(false)
    const status = TARGET[action]
    const { error } = await supabase.from('projects').update({ status }).eq('id', projectId)
    setBusy(false)
    if (error) return setFailed(true)
    onDone(status)
    onClose()
  }

  return (
    <ConfirmDialog
      open={action !== null}
      name="project-status-confirm"
      title={action ? t(LABEL[action]) : ''}
      body={action ? t(BODY[action]) : ''}
      primaryLabel={action ? t(LABEL[action]) : ''}
      onPrimary={() => void apply()}
      secondaryLabel={t('common.cancel')}
      onSecondary={() => { setFailed(false); onClose() }}
      onClose={() => { setFailed(false); onClose() }}
      busy={busy}
      error={failed ? t('common.unexpectedError') : undefined}
    />
  )
}
