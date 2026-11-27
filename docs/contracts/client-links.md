# Client links

Status: backend contract implemented in migration 008 and `/api/` handlers. Links are named, read-only bearer credentials for one project. The owner preview calls the same filtered RPC as the public client link.

## Rules

- Tokens contain 32 random bytes, are returned once, and are stored only as a SHA-256 hash. Links expire within 90 days and can be revoked immediately. Maximum 50 active links per project.
- By default no stage has a row in `project_stage_client_visibility`, so no stage is visible. GC enables a stage with `visible=true`; photo visibility is separate with `photos_visible=true`.
- The view returns only `stage_reports.status='confirmed'`. `accepted` and `pending` values and internal comments are never returned. A stage without a confirmed report is omitted, even if its visibility is enabled. Only confirmed report photos from a visible stage with separate photo consent are returned.
- Response `disclaimer` is an i18n key: `client.disclaimer.percentNotPayment` (RU text: «% — ход работ, не основание для оплаты»).
- Each token resolves to one `project_id`; no data from other projects or firms is queried into the response. Photo paths are converted to short-lived signed URLs by the API.

## API

### `POST /api/client-links`

Requires a GC JWT who owns the project. Create body:

```json
{"action":"create","project_id":"uuid","display_name":"Имя заказчика","expires_at":"ISO-8601 optional"}
```

Default expiry is 30 days. Response `201`: `link_id`, one-time `token`, `display_name`, `expires_at`. The raw token is never retrievable later. To list link state use `{"action":"list","project_id":"uuid"}`; tokens and hashes are omitted.

Revoke body: `{"action":"revoke","link_id":"uuid"}`. Response: `{"revoked":true}`.

Errors: `unauthorized`, `forbidden`, `invalid_action`, `invalid_project_id`, `invalid_display_name`, `invalid_expiry`, `project_not_found`, `client_link_limit`, `link_create_failed`, `link_list_failed`, `invalid_link_id`, `link_not_found`, `revoke_failed`.

### `GET /api/client-visibility?project_id=uuid`

Requires an owning GC JWT. Returns `{visibility: {"<stage_id>": {"visible": false, "photos": false}}}` for every stage in the project. Stages with no saved settings are returned as hidden with photo consent off. This is the persisted setting state, not a device-local preview cache. Errors: `unauthorized`, `forbidden`, `invalid_visibility`, `project_not_found`, `visibility_read_failed`.

### `POST /api/client-visibility`

Requires an owning GC JWT. Body: `{"project_id":"uuid","stage_id":"uuid","visible":true,"photos_visible":false}`. If `visible=false`, photo visibility is forced off. Errors: `unauthorized`, `forbidden`, `invalid_visibility`, `project_not_found`, `stage_not_found`, `visibility_update_failed`.

### `GET /api/client-view`

Public client view. `Authorization: Bearer <client-link-token>`. Returns `{project_id, project_name, disclaimer, contractor_contact:{name,email,phone}, stages:[{stage_id,name,confirmed_percent,updated_at,photos:[{path,url}]}]}`. Contact values come from the owning GC's existing profile and Auth account (`full_name`, email, phone); any missing value is `null`. The current company schema has no separate contractor contact settings. No sample or fallback contact details are fabricated. Errors: `invalid_client_link`, `contractor_contact_unavailable`, `server_misconfigured`.

### `POST /api/client-view`

Owner preview. Requires the owning GC JWT and body `{"project_id":"uuid"}`. Calls the same `client_project_view` RPC, returns the same `contractor_contact` fields (each nullable), and applies the same photo URL signing as GET. Errors: `unauthorized`, `forbidden`, `invalid_project_id`, `project_not_found`, `contractor_contact_unavailable`.

## Database RPCs

`create_client_link`, `revoke_client_link`, `set_client_stage_visibility`, and `client_project_view` are service-role-only. `client_project_view` accepts either a valid link token or an owner ID and returns identical filters in both cases. Client link and visibility tables have RLS; clients cannot query them directly.
