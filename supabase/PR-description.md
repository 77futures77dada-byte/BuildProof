# PR: worker and client links, corrected worker report handling

## Changes

- Migration 007 explicitly installs `pgcrypto` in `extensions`; every function that calls `digest()` pins `search_path=public,extensions`.
- `authorize_worker_link` updates `last_used_at` into a row variable, then returns that row through `RETURN QUERY`.
- Worker report review thresholds apply to the absolute change. A decrease larger than the project's `review_threshold` stays `pending` and does not change accepted stage progress.
- GC and foremen can review reports; self-review is rejected.
- Adds expiring, revocable, named worker links, scoped to a single project, with only SHA-256 token digests stored in the database.
- Adds expiring, revocable client links. Client view and owner preview use the same server-side filter: only confirmed reports on explicitly visible stages, with photos gated by separate consent.
- Adds API contracts and pgTAP coverage for scoped access, revoked/expired links, threshold handling, client visibility, and preview parity.
- Worker page metadata now includes the real project name; owner link lists include worker `report_count`; visibility settings expose persisted hidden-by-default state; client views include nullable contractor contact from existing owner profile/Auth fields.

## Migration order

1. `supabase/migrations/007_worker_links_and_owner_review.sql`
2. `supabase/migrations/008_client_links.sql`

No new migration is needed for the additional page metadata; it uses the existing RPCs and tables through owner-validated service-role API handlers.

Do not apply migrations as part of PR review. To roll back, run `supabase/rollback/008_client_links.sql`, then `supabase/rollback/007_worker_links_and_owner_review.sql`. The 007 rollback intentionally keeps `pgcrypto`, because migration 006 and other database functions also depend on it. The 007 rollback removes worker-link reports and their photos/history because those rows cannot satisfy the original non-null `reporter_id` constraint.

## Validation

- pgTAP tests include a worker-token authorization call with `search_path=public,extensions` and a large-decrease case that remains pending without changing stage progress.
- The SQL tests must run in the configured Supabase/PostgreSQL test environment before applying the migrations. They were not applied by this change.

## Waiting on owner

- Confirm whether exact SHA-256 image matching is sufficient as a duplicate signal, or whether perceptual matching is required.
- Supply the final approved UI copy for link states and the client disclaimer localization key.
