import { supabase } from './supabaseClient'
import type { Project } from '../types'

export interface NewProjectInput {
  name: string
  address: string
  /** ISO date (yyyy-mm-dd) or '' for none. */
  deadline: string
}

/**
 * Creates a project and seeds one `project_stages` row per `stage_templates`
 * entry (progress 0).
 *
 * NOTE: this is two round-trips and is therefore not atomic. The durable fix is
 * a Postgres trigger on `projects` (or a SECURITY DEFINER RPC) that inserts the
 * stage rows in the same transaction. Until that exists, if stage seeding fails
 * we surface the error so the operator can retry / clean up rather than leaving
 * a silently half-created project.
 */
export async function createProjectWithStages(
  input: NewProjectInput,
  companyId: string,
): Promise<Project> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      address: input.address.trim() || null,
      deadline: input.deadline || null,
      status: 'active',
    })
    .select('id, company_id, name, address, deadline, budget, status')
    .single()

  if (projectError) throw projectError

  const { data: templates, error: templatesError } = await supabase
    .from('stage_templates')
    .select('id')
    .order('sort_order')

  if (templatesError) throw templatesError
  if (!templates || templates.length === 0) {
    throw new Error(
      'Объект создан, но не найден список этапов (stage_templates). Заполните справочник этапов.',
    )
  }

  const { error: stagesError } = await supabase.from('project_stages').insert(
    templates.map((t) => ({
      project_id: project.id,
      stage_template_id: t.id,
      progress_percent: 0,
    })),
  )

  if (stagesError) {
    throw new Error(
      `Объект «${project.name}» создан, но не удалось создать этапы: ${stagesError.message}. ` +
        'Откройте объект и повторите инициализацию этапов.',
    )
  }

  return project as Project
}
