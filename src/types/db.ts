/**
 * TypeScript mirror of the BuildProof Supabase schema.
 *
 * These types are hand-maintained against the database. When the schema changes,
 * update this file (or regenerate with `supabase gen types typescript`).
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserRole = 'client' | 'gc' | 'foreman' | 'worker'

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type IssuePriority = 'low' | 'medium' | 'high'

export type IssueStatus = 'open' | 'in_progress' | 'resolved'

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export interface Company {
  id: string
  name: string
}

export interface Profile {
  id: string // references auth.users.id
  company_id: string | null
  full_name: string | null
  role: UserRole
}

export interface Project {
  id: string
  company_id: string
  name: string
  address: string | null
  deadline: string | null // ISO date
  budget: number | null
  status: ProjectStatus
}

export interface ProjectAccess {
  project_id: string
  user_id: string
}

/** Fixed catalogue of construction stages, ordered by `sort_order`. */
export interface StageTemplate {
  id: string
  name: string
  sort_order: number
}

export interface ProjectStage {
  id: string
  project_id: string
  stage_template_id: string
  progress_percent: number // 0..100
  updated_at: string // ISO timestamp
  updated_by: string | null
}

export interface StageHistory {
  id: string
  project_stage_id: string
  old_percent: number
  new_percent: number
  changed_by: string | null
  changed_at: string // ISO timestamp
}

export interface Photo {
  id: string
  project_id: string
  project_stage_id: string | null
  storage_path: string
  caption: string | null
  uploaded_by: string | null
  uploaded_at: string // ISO timestamp
}

export interface Task {
  id: string
  project_id: string
  project_stage_id: string | null
  title: string
  assigned_to: string | null
  deadline: string | null // ISO date
  status: TaskStatus
  created_by: string | null
}

export interface Issue {
  id: string
  project_id: string
  title: string
  description: string | null
  photo_path: string | null
  priority: IssuePriority
  responsible_party: string | null
  status: IssueStatus
  due_date: string | null // ISO date
  created_by: string | null
}

// ---------------------------------------------------------------------------
// Convenience labels for UI (kept next to the types they describe)
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<UserRole, string> = {
  client: 'Заказчик',
  gc: 'Генподрядчик',
  foreman: 'Прораб',
  worker: 'Рабочий',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'В работе',
  on_hold: 'Приостановлен',
  completed: 'Завершён',
  archived: 'В архиве',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Готово',
}

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
  resolved: 'Решена',
}

/**
 * The canonical seven stage templates, in display order.
 * The database is the source of truth; this list documents what we expect and
 * is used as a fallback ordering key.
 */
export const STAGE_TEMPLATE_NAMES = [
  'Фундамент',
  'Каркас',
  'Кровля',
  'Окна',
  'Электрика',
  'Сантехника',
  'Отделка',
] as const
