# Worker links

Status: backend contract implemented in migrations 006 and 007. Worker links are bearer credentials without Supabase user accounts or email identities. `src/` is not changed by this contract.

## Security model

- Each link belongs to exactly one project and has a display name, expiration, revocation time, and `last_used_at` audit timestamp.
- The API creates a 32-byte random URL-safe token and returns it only on creation. PostgreSQL stores only its SHA-256 hex digest in `worker_links.token_hash`.
- Link reads and submissions go through `/api/` and service-role-only RPCs. They do not use JWT email, `profiles`, user sessions, or direct table access.
- A link can read its object's stage list and its own recent reports, and submit reports only to stages in that object. It cannot read other links, projects, firms, reports, confirm reports, view people, or access billing.
- Maximum active links: 100 per project. Lifetime: at most 90 days. Revocation is immediate.
- Submission limits: 10 reports per link per hour, 1–5 photos, 2 MiB per image, 3 MiB total; JPEG, PNG, or WebP only. Images are stored in the private `project-photos` bucket. The API computes a SHA-256 image-byte hash as a duplicate signal; it is not a perceptual hash.

## API

### `POST /api/worker-links`

Requires a Supabase JWT for a GC who owns the project. Create body:

```json
{"action":"create","project_id":"uuid","display_name":"Имя","expires_at":"ISO-8601 optional"}
```

Default expiry is 30 days. Response `201` returns `link_id`, one-time `token`, `display_name`, and `expires_at`. The raw token is never retrievable later. To list records without secrets use `{"action":"list","project_id":"uuid"}`; each link includes `report_count` (all reports submitted with that link), alongside its expiry, creation, revocation and last-use fields. The response never includes `token_hash`.

Revoke body: `{"action":"revoke","link_id":"uuid"}`. Response: `{"revoked":true}`.

Errors: `unauthorized`, `forbidden`, `invalid_action`, `invalid_project_id`, `invalid_display_name`, `invalid_expiry`, `project_not_found`, `worker_link_limit`, `link_create_failed`, `link_list_failed`, `invalid_link_id`, `link_not_found`, `revoke_failed`.

### `GET /api/worker-link-stages`

`Authorization: Bearer <worker-link-token>`. Returns `{project_id, project_name, worker_name, stages:[{id,name,progress_percent}]}`. `project_name` is the actual project name from the database. Errors: `invalid_worker_link`, `project_data_unavailable`, `server_misconfigured`.

### `POST /api/worker-link-submit`

`Authorization: Bearer <worker-link-token>`. Body:

```json
{"stage_id":"uuid","claimed_percent":0,"taken_at":"ISO-8601 or null","device_time":"ISO-8601","client_request_id":"uuid","decrease_reason":"rework|count_error|demolition or null","photos":[{"content_type":"image/jpeg","base64":"..."}]}
```

`taken_at` is EXIF `DateTimeOriginal` read before compression; `device_time` is the device clock; `uploaded_at` is set by the server at receipt. They are stored separately. A decrease requires `decrease_reason`. A change whose absolute difference from the current stage value is at most the project's `review_threshold` is `accepted` and advances the stage. A larger increase or decrease is `pending` and does not advance it until review. A repeated `client_request_id` returns the existing report without duplicating it.

Response includes `report_id`, `status`, `duplicate_of`, and `duplicate_request`. Errors: `invalid_worker_link`, `invalid_report`, `invalid_percent`, `invalid_time`, `invalid_decrease_reason`, `decrease_reason_required`, `invalid_photo_count`, `invalid_photo`, `photo_size_or_type_invalid`, `total_photo_size_exceeded`, `photo_upload_failed`, `worker_link_rate_limit`, `stage_not_found`, `invalid_photo_path`, `request_failed`.

### `GET /api/worker-link-reports?limit=20`

Same bearer token. Limit is 1–50, default 20. Returns only reports with this link's `worker_link_id`, including status, claimed percentage, the three timestamps, and photo paths with five-minute signed URLs. Errors: `invalid_worker_link`, `invalid_limit`.

## Database RPCs

`create_worker_link`, `revoke_worker_link`, `authorize_worker_link`, `worker_link_stages`, `worker_link_reports`, and `submit_worker_link_report` are executable only by `service_role`. Public and authenticated roles have no direct table privileges. `review_stage_report(s)` accept owner/foreman JWTs only; a worker-link token cannot confirm a report.
