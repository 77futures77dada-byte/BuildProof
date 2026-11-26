# Contract: client read-only links (UI ↔ backend)

Status: **proposal from the UI side, waiting for Codex.** Nothing here exists in the database. No UI is built: the redesign PR shows only a stub. Migrations, RLS and function bodies belong to Codex. Field names can change if both sides agree in this file.

Sources: `docs/design-inputs/buildproof-decisions.md` §2 (client link), §4 (success metric); `docs/contracts/reports.md` §2 (`project_stage_client_visibility`), §4 (what the client page reads); `docs/design/01-business-flow.md` §2.2, §3.5, K8, K9.

## Why

- The success metric is «project closed with an open client link» (`decisions.md` §4). Nothing in the schema can measure it today.
- The only way to show a client anything today is a `client` account. That account sees every stage, photo and issue of the project (K8). `decisions.md` §2 asks for the opposite: everything hidden by default, stages switched on one by one.

## 1. `client_links` — one row per link

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `project_id` | uuid → `projects.id` | |
| `token` | text | Secret, hashed at rest; only the hash is stored. Shown to the owner once, when the link is created |
| `label` | text, null | Who the link is for, e.g. «Заказчик Тамм». Visible only to the owner |
| `created_by` | uuid → `profiles.id` | must be `gc` of the project's company |
| `created_at` | timestamptz default now() | |
| `expires_at` | timestamptz, null | null = no expiry. UI default: proposal 90 days, **waiting for the owner** |
| `revoked_at` | timestamptz, null | set by «Отозвать ссылку» |
| `first_opened_at` | timestamptz, null | set by the server on the first successful open |
| `last_opened_at` | timestamptz, null | |

Visible stages stay in `project_stage_client_visibility(project_id, project_stage_id, visible bool default false)` from `reports.md` §2. A per-link list (`visible_stage_ids`) is not proposed: one project means one visibility setting, which keeps «предпросмотр как заказчик» honest. If Codex prefers a per-link list, record it here.

## 2. RPCs

- `create_client_link(p_project_id, p_label, p_expires_at) returns text`
  - caller must be `gc` of the project's company;
  - returns the plain token once.
- `revoke_client_link(p_link_id)` — same check; sets `revoked_at`.
- `client_view(p_token)` — `anon` may call it, `security definer`. It returns:
  - the project's name and address;
  - visible stages only;
  - per stage: the last value from `accepted`/`confirmed` reports (or only `confirmed`, see open question 1). For a stage with a `pending` report it returns the last counted value and a flag `updating = true`;
  - photos of those stages only;
  - never issues, tasks, people, comments, or internal notes.

  On every successful call it sets `first_opened_at` if null and updates `last_opened_at`. A revoked, expired or unknown token gets one generic error `link_unavailable`, so the response does not reveal which case it was.

## 3. Definitions the metrics need

- **Open link** (for «Успех»): `revoked_at is null` at the moment the project becomes `completed`, **and** `first_opened_at is not null`.
- **Success is counted per project, not per token** [О3-14, М3-7]. A project with `status = 'completed'` succeeds if **any** of its links is open. A replacement link (§4) does not reset the fact that the old link was opened. Proposal: compute it as `min(first_opened_at)` over all of the project's links, or store it on the project.
  - Gap: `projects` has no `completed_at`. Proposal: add it, or log status changes. Codex decides.

## 4. What the UI will do once it exists

- Owner, project «⋯» → «Ссылка для заказчика». The screen has a list of stages with switches (all off), «Предпросмотр как заказчик», and «Создать ссылку» (copy / WhatsApp). In the UI `label` is required.
- **Lost link** [О3-14, М3-7]: the token cannot be shown again. The action is «Создать новую ссылку» with one confirmation. It creates a new link and revokes the old one in the same step. Proposal: one RPC `replace_client_link(p_link_id) returns text`, so a half-done replacement cannot happen. The owner's list shows only active links.
- Client page: text «% — ход работ, не основание для оплаты», visible stages, photos. For a `pending` stage, a quiet «обновляется».
- Revoked or expired link: «Ссылка больше не действует». The contractor's contact is shown only if the company has one. There is no phone field yet (K23).

## 5. Open questions

1. **Waiting for the owner (K9):** does the client see `accepted` (marked by the crew, not reviewed) or only `confirmed`? `decisions.md` §2 says «только проверенное», `reports.md` §4 says `confirmed` and `accepted`.
2. Default expiry: 90 days, until the project is closed plus N days, or none?
3. Rate limit and abuse protection for `client_view` (anon endpoint).
4. Should a link keep working after the project is `completed` (read-only archive) and for how long? The landing text (`trust.dataText`) says photos are kept 12 months after archive; billing and archive do not exist yet.
