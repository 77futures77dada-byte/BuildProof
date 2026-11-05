# Contract: stage reports (UI ↔ backend)

Status: **proposal from the UI side, waiting for Codex.** Nothing here exists in the database yet, and the UI for reports is not built. The UI PR starts once these fields and RPCs exist under these names, or under names agreed in this file. Migrations and RLS are Codex's.

Source of the rules: `buildproof-decisions.md` §2, §5.

## 1. `stage_reports` — one row per report sent by a worker

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `project_stage_id` | uuid → `project_stages.id` | |
| `worker_link_id` | uuid → `worker_links.id`, null | null when an owner/manager reports from their own account |
| `reported_by` | uuid → `profiles.id`, null | set when the reporter is signed in |
| `claimed_percent` | int 0–100 | what the worker marked |
| `confirmed_percent` | int 0–100, null | value that counts. Set at insert for `accepted`, set by the foreman for `confirmed` |
| `previous_confirmed_percent` | int 0–100 | confirmed value of the stage at the moment of the report (makes the jump auditable) |
| `status` | enum `accepted` \| `pending` \| `confirmed` \| `rejected` | see §3 |
| `taken_at` | timestamptz, null | EXIF `DateTimeOriginal`, read on the phone **before** compression. Null if the photo has no EXIF |
| `device_time` | timestamptz | phone clock when the report was created (it may be queued offline) |
| `uploaded_at` | timestamptz default now() | server time of arrival |
| `photo_path` | text | storage path in `project-photos` |
| `phash` | text, null | perceptual hash (64-bit, hex). Used only as a duplicate **signal** |
| `duplicate_of` | uuid → `stage_reports.id`, null | set when `phash` matches a report in the same project |
| `decrease_reason` | enum `rework` \| `count_error` \| `demolition`, null | required when `claimed_percent` < `previous_confirmed_percent` |
| `reviewed_by` | uuid → `profiles.id`, null | |
| `reviewed_at` | timestamptz, null | |
| `review_note` | text, null | reason when returned (`rejected`) |
| `client_request_id` | uuid unique | generated on the phone. Makes retries from the offline queue idempotent |

## 2. Settings

- `projects.review_threshold` int, default **25** (percentage points).
- `worker_links`: `id`, `project_id`, `display_name`, `token` (secret, hashed at rest), `created_by`, `created_at`, `revoked_at` null, `last_seen_at`, `other_device_seen_at` null. When the backend can tell that the link was opened on a second device, it sets `other_device_seen_at`, and the owner UI shows «открыта на другом телефоне». One link per person.
- Client visibility: `project_stage_client_visibility(project_id, project_stage_id, visible bool default false)`. Everything is hidden by default.

## 3. Status rules (server-side, in one RPC)

`submit_stage_report(p_link_token | auth, p_project_stage_id, p_claimed, p_taken_at, p_device_time, p_photo_path, p_phash, p_decrease_reason, p_client_request_id)`:

1. `jump = claimed − current confirmed`.
2. `jump > review_threshold` → `pending`. The stage's confirmed value does not change.
3. `0 ≤ jump ≤ threshold` → `accepted`, `confirmed_percent = claimed`, and the stage value moves. The UI labels it «принято» (from the crew, not reviewed).
4. `claimed < confirmed` → requires `decrease_reason`. Then `accepted`; the stage value moves down and a `stage_history` row is written with the reason.
5. The same `client_request_id` again returns the existing row (no duplicate).

`review_stage_report(p_report_id, p_decision 'confirm' | 'reject', p_note)` → `confirmed` (the stage value becomes `claimed`) or `rejected`.
`review_worker_day(p_worker_link_id, p_date)` confirms all `pending` and `accepted` reports of one worker for one day in one transaction (batch confirmation).

There is no automatic confirmation. **Escalation** (backend trigger or cron): a `pending` report older than 24 h notifies the foreman (`manager`); after another 24 h it notifies the owner (`gc`).

## 4. What the UI reads

- Stage readiness: `confirmed_percent` of the stage (accepted + confirmed). Second figure: the latest `claimed_percent` including pending.
- Project readiness = Σ(weight × confirmed) / Σ weight, and the same over claimed. The UI needs `project_stages.weight` (int; template defaults, editable per object).
- Labels: `accepted` → «Принято», `pending` → «Ждёт проверки ○», `confirmed` → «Проверено ✓». The ✓ appears only for `confirmed`.
- Report card: «снято {taken_at} · отправлено {uploaded_at}», plus «был офлайн» when `uploaded_at − device_time` > 15 min. If `taken_at` is null: «время съёмки неизвестно».
- Freshness of a stage or project, from the latest `uploaded_at`: today / 1–2 days / 3–6 / 7+. A planned pause (`project_stages.paused_until` or a pause reason) turns red off.
- Client page: only `visible` stages; only `confirmed` and `accepted`. For a stage with a pending report it shows the last confirmed value and a quiet «обновляется».

## 5. Open questions for Codex

1. Does phash run on the client (smaller upload, but the client can forge it) or in an Edge Function?
2. Can `other_device_seen_at` be detected without fingerprinting? (Proposal: a random device id in localStorage, sent with each report.)
3. Is the 24 h / 48 h escalation sent through push (PWA) + e-mail, and which e-mail provider? (The landing «Ваши данные» block needs the name.)
4. Should `accepted` small reports keep counting toward the main figure if the foreman later returns them (`rejected`)? Proposal: yes, until rejected; on reject the stage goes back to `previous_confirmed_percent`.
