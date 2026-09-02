import { supabase } from './supabaseClient'

export interface NewProjectInput {
  name: string
  address: string
  /** ISO date (yyyy-mm-dd) or '' for none. */
  deadline: string
}

/**
 * Creates a project and seeds one `project_stages` row per `stage_templates`
 * entry (progress 0) in a single transaction.
 *
 * Backed by the Postgres function `create_project_with_stages`, so this is one
 * round-trip with one point of failure — either the whole project (with its 7
 * stages) is created, or nothing is.
 *
 * @returns the new project's id
 */
export async function createProjectWithStages(
  input: NewProjectInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_project_with_stages', {
    p_company_id: companyId,
    p_name: input.name.trim(),
    p_address: input.address.trim() || null,
    p_deadline: input.deadline || null,
    p_budget: null,
  })

  if (error) throw error
  if (typeof data !== 'string') {
    throw new Error('Не удалось создать объект: сервер не вернул идентификатор.')
  }
  return data
}
