import { supabase } from './supabaseClient'

export interface NewTaskInput {
  projectId: string
  title: string
  assignedTo: string | null
  /** ISO date (yyyy-mm-dd) or null. */
  deadline: string | null
  projectStageId: string | null
  createdBy: string
}

/** Create a task in the `todo` state. Single-row insert — atomic on its own. */
export async function createTask(input: NewTaskInput): Promise<void> {
  const { error } = await supabase.from('tasks').insert({
    project_id: input.projectId,
    title: input.title.trim(),
    assigned_to: input.assignedTo,
    deadline: input.deadline,
    project_stage_id: input.projectStageId,
    status: 'todo',
    created_by: input.createdBy,
  })
  if (error) throw error
}
