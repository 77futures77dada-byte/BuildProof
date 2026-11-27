# Company data export and storage

Company export is included in every plan at no charge. Only an authenticated `gc` (firm owner) may request exports or view storage usage. Server endpoints validate the caller's JWT and company; database RPCs independently validate the owner and company pair. Responses contain no other firm's data.

The storage policy follows `src/config/pricing.ts`: at most 10 active projects and 50 GB (`50,000,000,000` bytes) of project photos per company. Keep these database limits in sync if pricing configuration changes. Storage is counted from `storage.objects.metadata.size` for the private `project-photos` bucket. A database trigger checks every new object, including direct storage uploads. At the limit, the new object is rejected with `company_storage_limit_exceeded` or `company_project_limit_exceeded`; existing objects and previously saved reports are retained.

## `GET /api/company-export?format=json|csv`

Requires `Authorization: Bearer <Supabase JWT>` for a GC. `format` defaults to `json`.

- **JSON** returns company data with projects and their stages, reports (including status and linked history), stage history, issues, tasks, and photo records. Stored photo paths are accompanied by short-lived signed URLs (300 seconds), including issue photo references.
- **CSV** returns UTF-8 CSV with columns `record_type,project_id,record_id,payload`. Each payload is the complete JSON record for that row; `report` rows include review status, history, and attached photos. This flat format can be imported without losing nested fields.
- Every attempt that passes the rate gate is written to `company_export_log` with the requester, format, timestamp, outcome, and output byte count when completed. Limit: 5 export attempts per company per hour.

Errors: `unauthorized` (401), `forbidden` (403), `invalid_export_format` (400), `export_rate_limit` (429), `export_start_failed` (500), `export_failed` (500), `signed_url_failed` (500), `export_log_failed` (500), `server_misconfigured` (500).

## `GET /api/company-storage`

Requires the same GC JWT. Returns `{company_id,used_bytes,used_gb,active_projects,max_bytes,max_active_projects,storage_limit_exceeded,project_limit_exceeded}`. Errors: `unauthorized` (401), `forbidden` (403), `storage_usage_failed` (500), `server_misconfigured` (500).

## Upload rejection

Supabase Storage may return the trigger message as a failed upload response. The stable error codes are `company_storage_limit_exceeded` (413) and `company_project_limit_exceeded` (409). The worker-link upload endpoint maps these messages to the same codes and statuses. No report/photo row is committed when its storage upload fails.

## Claude Code interface tasks

- Add an owner-only “Export company data” action with JSON/CSV choice, loading/completed/failed states, and the 5-per-hour limit message.
- Add a storage usage meter for the 50 GB company cap and active-project count against 10; describe the limit as a storage/plan limit, not an upload retry problem.
- Surface the stable storage rejection codes on photo upload screens and preserve the already saved report list when a new upload is rejected.
- Show that signed photo URLs expire and allow the owner to request a fresh export.
