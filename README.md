# BuildProof

SaaS for construction-site transparency: per-stage progress, site photos, tasks and issues for each project.

## Stack and local setup

The web client is Vite + React + TypeScript; Supabase provides Postgres, Auth and Storage; Vercel serves the SPA and `api/invite.ts` serverless route.

```bash
npm ci
cp .env.example .env
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` for the browser client. Never put the service role key in a `VITE_` variable or commit it.

## Database setup

Install the Supabase CLI and Docker, then run:

```bash
supabase start
supabase db reset
supabase test db
```

Migrations are the source of truth in `supabase/migrations/`. `000_baseline.sql` reconstructs the application schema; later numbered migrations harden policies and add RPCs. The `project-photos` bucket is private, limited to 10 MB per object, and accepts JPEG, PNG and WebP. Local credentials and API URLs are printed by `supabase start`.

For production, link the CLI to the Supabase project and apply committed migrations with `supabase db push`. Create the first auth user in Supabase Auth, then add its profile through the SQL editor with the intended `company_id`, `full_name`, and `role='gc'`. Create a company row first if needed. Do not grant a user the `gc` role through the public client.

## Roles and table access

| Role | Projects | Progress reports | Tasks and issues | Membership |
| --- | --- | --- | --- | --- |
| `gc` | All projects in own company | Submit; manages project | Create and manage | Invite users and grant same-company project access |
| `foreman` | Projects in own company/access list | Submit | Manage tasks and issues | Read project members |
| `worker` | Projects in own company/access list | Submit; increases require a photo, decreases require a comment | Update status on assigned tasks; create issues | Read project members |
| `client` | Explicitly granted projects | Read only | Read only | Read project members |

All authenticated users can read stage templates. Profiles can update only their own `full_name` and `locale`. Stage progress and history can only be written through RPCs. Public tables have RLS enabled; service-role operations are server-side only.

## RPC and API contracts

| Name | Purpose |
| --- | --- |
| `create_project_with_stages(p_company_id, p_name, p_address, p_deadline, p_budget)` | Creates a company project and its initial stages atomically; gc in that company only. |
| `update_stage_progress(p_project_stage_id, p_new_percent)` | Legacy manager-only progress update; writes history atomically. |
| `submit_stage_report(p_project_stage_id, p_new_percent, p_comment, p_photo_paths)` | Atomic report, progress, history and photo metadata write; returns the report UUID. Retries with the same payload within ten minutes return the existing report. |
| `project_activity(p_project_id, p_limit, p_before)` | Paginated, RLS-aware activity feed. Limit is capped at 100. |
| `pilot_metrics(p_project_id)` | Company gc metrics: reports, active reporters, median interval, photo share and last report. |
| `POST /api/invite` | Invites a foreman, worker or client. Requires `Authorization: Bearer <access_token>`. Body: `email`, `full_name`, `role`, optional `project_ids`, optional `locale`. |

The API returns 401 without a valid token, 403 for a non-gc or a project outside the gc company, 409 for an unavailable email, and 429 after 20 invitation attempts per company in an hour.

## Vercel environment variables

Add these in **Project Settings → Environment Variables**, separately for Production and Preview:

| Variable | Use |
| --- | --- |
| `VITE_SUPABASE_URL` | Browser Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Browser publishable/anon key |
| `SUPABASE_URL` | Serverless Supabase URL |
| `SUPABASE_ANON_KEY` | Serverless token validation client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only invite operations; never prefix with `VITE_` |
| `SITE_URL` | Exact deployed origin used for invite redirects (production domain for Production, preview URL/domain for Preview) |

Redeploy after changing environment values. Keep Preview secrets scoped to trusted preview deployments.

## Demo project and read-only client

Create two Auth users manually in the Supabase dashboard before running `supabase/seed/demo.sql`:

1. `demo-client@<your-domain>` is the landing's read-only login. Give the actual email and password to the product owner through the normal secret channel; never store them in SQL, Git, Vercel source, or this README.
2. `demo-worker@<your-domain>` is the seeded report author used for sample history.

Edit the two email values at the top of the SQL file before running it. It creates a separate Demo company and a single sample project; the client receives access only to that project. The landing's sign-in links to `/login`; enter the demo client's email and password there. The current landing does not prefill or auto-submit demo credentials. Do not reuse a real user's credentials.

The seed references six generated sample JPEGs under `demo/`. In Supabase Storage, open the private `project-photos` bucket, create a `demo` folder, and upload `demo/sample-01.jpg` through `demo/sample-06.jpg` into it. The objects are readable only when a matching photo row grants access to the demo project. These are decorative generated placeholders, not construction evidence.

## Backup and restore

Enable Supabase Point-in-Time Recovery (PITR) when the project plan supports it. Otherwise schedule a daily encrypted `pg_dump` to protected off-site storage, retain multiple restore points, and periodically rehearse restoring a dump into a separate database. Never commit dumps or credentials.

## CI

Pull requests run `npm ci`, lint, production build, and TypeScript checks. A database job starts Supabase in Docker, resets a clean database from migrations, and runs `supabase/tests/rls.sql`.
