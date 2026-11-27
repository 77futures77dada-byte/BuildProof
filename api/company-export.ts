import { owner, type ApiRequest, type ApiResponse } from './lib/backend.ts'

type ExportRecord = Record<string, unknown>
type ExportReport = { report?: ExportRecord; history?: ExportRecord[]; photos?: ExportRecord[] }
type ExportProject = {
  project?: ExportRecord
  stages?: ExportRecord[]
  reports?: ExportReport[]
  history?: ExportRecord[]
  issues?: ExportRecord[]
  tasks?: ExportRecord[]
  photos?: ExportRecord[]
}
type ExportRow = { company?: ExportRecord; projects?: ExportProject[] }
type ExportResponse = ApiResponse & { setHeader(name: string, value: string): void; send(body: string): void }

function collectPhotoPaths(value: unknown, paths = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectPhotoPaths(item, paths)
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if ((key === 'storage_path' || key === 'photo_path') && typeof item === 'string') paths.add(item)
      else collectPhotoPaths(item, paths)
    }
  }
  return paths
}

function attachSignedUrls(value: unknown, signed: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => attachSignedUrls(item, signed))
  if (!value || typeof value !== 'object') return value
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    result[key] = attachSignedUrls(item, signed)
    if (key === 'storage_path' && typeof item === 'string') result.url = signed.get(item) ?? null
    if (key === 'photo_path' && typeof item === 'string') result.photo_url = signed.get(item) ?? null
  }
  return result
}

function csvCell(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export function exportCsv(data: ExportRow) {
  const rows: Array<[string, string, string, unknown]> = []
  rows.push(['company', '', String(data.company?.id ?? ''), data.company ?? {}])
  for (const projectGroup of data.projects ?? []) {
    const project = projectGroup.project ?? {}
    const projectId = String(project.id ?? '')
    rows.push(['project', projectId, projectId, project])
    for (const stage of projectGroup.stages ?? []) rows.push(['stage', projectId, String(stage.id ?? ''), stage])
    for (const reportGroup of projectGroup.reports ?? []) {
      const report = reportGroup.report ?? {}
      rows.push(['report', projectId, String(report.id ?? ''), { ...report, history: reportGroup.history ?? [], photos: reportGroup.photos ?? [] }])
    }
    for (const history of projectGroup.history ?? []) rows.push(['stage_history', projectId, String(history.id ?? ''), history])
    for (const issue of projectGroup.issues ?? []) rows.push(['issue', projectId, String(issue.id ?? ''), issue])
    for (const task of projectGroup.tasks ?? []) rows.push(['task', projectId, String(task.id ?? ''), task])
    for (const photo of projectGroup.photos ?? []) rows.push(['photo', projectId, String(photo.id ?? ''), photo])
  }
  return ['record_type,project_id,record_id,payload', ...rows.map((row) => row.map(csvCell).join(','))].join('\r\n')
}

function setExportHeaders(res: ExportResponse, format: string) {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="buildproof-export.csv"')
  } else {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="buildproof-export.json"')
  }
}

export default async function handler(req: ApiRequest, response: ApiResponse) {
  const res = response as ExportResponse
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  let caller
  try { caller = await owner(req) } catch { return res.status(500).json({ error: 'server_misconfigured' }) }
  if ('error' in caller) return res.status(caller.error === 'unauthorized' ? 401 : 403).json({ error: caller.error })
  const formatValue = req.query?.format
  const format = Array.isArray(formatValue) ? formatValue[0] : formatValue ?? 'json'
  if (format !== 'json' && format !== 'csv') return res.status(400).json({ error: 'invalid_export_format' })

  const { admin } = caller
  const { data: exportId, error: beginError } = await admin.rpc('begin_company_export', {
    p_company_id: caller.companyId, p_actor_id: caller.user.id, p_format: format,
  })
  if (beginError) return res.status(beginError.message.includes('export_rate_limit') ? 429 : 500)
    .json({ error: beginError.message.includes('export_rate_limit') ? 'export_rate_limit' : 'export_start_failed' })
  const { data, error } = await admin.rpc('export_company_data', {
    p_company_id: caller.companyId, p_actor_id: caller.user.id,
  })
  if (error || !data) {
    await admin.rpc('finish_company_export', { p_export_id: exportId, p_actor_id: caller.user.id, p_outcome: 'failed', p_bytes: null })
    return res.status(500).json({ error: 'export_failed' })
  }
  const paths = [...collectPhotoPaths(data)]
  const signed = new Map<string, string>()
  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100)
    const { data: signedRows, error: signError } = await admin.storage.from('project-photos').createSignedUrls(batch, 300)
    if (signError) {
      await admin.rpc('finish_company_export', { p_export_id: exportId, p_actor_id: caller.user.id, p_outcome: 'failed', p_bytes: null })
      return res.status(500).json({ error: 'signed_url_failed' })
    }
    batch.forEach((path, index) => {
      const url = signedRows?.[index]?.signedUrl
      if (url) signed.set(path, url)
    })
  }
  const result = attachSignedUrls(data, signed) as ExportRow
  const body = format === 'csv' ? exportCsv(result) : JSON.stringify(result, null, 2)
  const { error: finishError } = await admin.rpc('finish_company_export', {
    p_export_id: exportId, p_actor_id: caller.user.id, p_outcome: 'completed', p_bytes: Buffer.byteLength(body),
  })
  if (finishError) return res.status(500).json({ error: 'export_log_failed' })
  setExportHeaders(res, format)
  if (format === 'csv') return res.status(200).send(body)
  return res.status(200).json(result)
}
