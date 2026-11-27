type ContactProfile = { full_name?: string | null } | null | undefined
type ContactAccount = { email?: string | null; phone?: string | null } | null | undefined

const present = (value: string | null | undefined) => value?.trim() || null

export function contractorContact(profile: ContactProfile, account: ContactAccount) {
  return {
    name: present(profile?.full_name),
    email: present(account?.email),
    phone: present(account?.phone),
  }
}

export function withProjectName<T extends Record<string, unknown>>(data: T, projectName: string) {
  return { ...data, project_name: projectName }
}

export function withReportCounts<T extends { id: string }, C extends { id: string; count: number | null }>(
  links: T[], counts: C[],
) {
  const byId = new Map(counts.map((item) => [item.id,item.count ?? 0]))
  return links.map((link) => ({ ...link, report_count: byId.get(link.id) ?? 0 }))
}

export function visibilityByStage(
  stages: Array<{ id: string }>,
  saved: Array<{ project_stage_id: string; visible: boolean; photos_visible: boolean }>,
) {
  const byStage = new Map(saved.map((row) => [row.project_stage_id,row]))
  return Object.fromEntries(stages.map((stage) => {
    const value = byStage.get(stage.id)
    return [stage.id,{ visible: value?.visible ?? false, photos: value?.photos_visible ?? false }]
  }))
}
