# PR: K15 report review and company email gate

## Changes

- Adds project `review_threshold` (default 25 percentage points) and report status, confirmed percentage, reviewer, review timestamp, and review note fields.
- Adds a batch review RPC limited to accepted reports from another reporter whose increase is within the project's configured threshold. The RPC only changes report status; sending already updates the stage, so confirming a report cannot restore an older percentage. Larger pending jumps can only be individually reviewed. A foreman cannot review their own report.
- Uses the firm's owner email domain for corporate addresses. Public mailbox domains are stored in `public.public_email_domains` so the set can be extended. An owner keeps access to their exact account; other public-domain addresses require an exact matching invitation in `invite_log`. Corporate addresses continue to pass by domain match.
- The server-side invite reservation RPC records public-mail invites by exact address. Onboarding and the database helper used by RLS admit that exact invited address and reject a different address at the same public provider.
- Adds RLS and RPC privilege assertions, cross-company report visibility/review assertions, public-mail invite cases, and review/self-review assertions in `supabase/tests/rls.sql`.
- Backfills one exact-address `invite_log` record for each existing worker or foreman without a matching invite, attributed to a GC in the firm and timestamped one day earlier. This preserves access for existing public-mail accounts; the anti-duplicate condition is safe to rerun.

## Migration order

1. `supabase/migrations/006_report_review_and_company_email.sql`

Do not apply this migration as part of this PR review. Rollback instructions are in `supabase/rollback/006_report_review_and_company_email.sql`; restore the replaced RPCs from migrations 002, 003, and 005 after removing the new fields.

## Excluded

- K34 is excluded because it concerns Supabase email templates and is waiting on SMTP setup.
- K35 is excluded pending a concrete description.
- Landing and application UI changes are excluded while Claude Code is editing the redesign.

## Validation

- App checks: lint, production build, 80 unit tests, token scan, Russian copy scan, and overflow scan passed on the base application.
- SQL test file contains 50 pgTAP assertions, including sequential report confirmation and an existing-worker backfill/access case. Could not execute them locally because PostgreSQL, Docker, and Supabase CLI are unavailable in this environment. No migration was applied.

## Review notes

For an owner with a public mailbox address, the firm has no broad email domain; invited members must match the exact invitation address. The Supabase Auth OTP delivery itself is outside the database/RPC boundary; invitation, onboarding, and RLS-backed data access enforce exact public-mail invitations or corporate-domain membership.
