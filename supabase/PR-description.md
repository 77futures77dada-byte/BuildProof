# PR: K15 report review and company email gate

## Changes

- Adds project `review_threshold` (default 25 percentage points) and report status, confirmed percentage, reviewer, review timestamp, and review note fields.
- Adds a batch review RPC limited to accepted reports from another reporter whose increase is within the project's configured threshold. Larger pending jumps can only be individually reviewed. A foreman cannot review their own report.
- Makes the firm email domain the domain of the firm's owner account. The server-side invite reservation RPC rejects addresses outside that domain. Onboarding attaches an invited user only to the company recorded for that exact invitation; existing accounts outside their profile firm's domain receive no company scope through the database helper used by RLS.
- Adds RLS and RPC privilege assertions, cross-company report visibility/review assertions, and review/self-review assertions in `supabase/tests/rls.sql`.

## Migration order

1. `supabase/migrations/006_report_review_and_company_email.sql`

Do not apply this migration as part of this PR review. Rollback instructions are in `supabase/rollback/006_report_review_and_company_email.sql`; restore the replaced RPCs from migrations 002, 003, and 005 after removing the new fields.

## Excluded

- K34 is excluded because it concerns Supabase email templates and is waiting on SMTP setup.
- K35 is excluded pending a concrete description.
- Landing and application UI changes are excluded while Claude Code is editing the redesign.

## Validation

- App checks: lint, production build, 80 unit tests, token scan, Russian copy scan, and overflow scan passed on the base application.
- SQL test file contains 44 pgTAP assertions. Could not execute them locally because PostgreSQL, Docker, and Supabase CLI are unavailable in this environment. No migration was applied.

## Review notes

Firm membership currently uses the owner's email domain as the firm's domain; confirm that this matches the intended company-email policy before applying the migration. The invitation and database access paths enforce the domain. The Supabase Auth OTP delivery itself is outside the database/RPC boundary.
