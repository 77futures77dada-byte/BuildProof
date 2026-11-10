# Contract: self sign-up onboarding (C0, UI ↔ backend)

Status: **proposal from the UI side, waiting for Codex.** Nothing here exists yet. The UI does **not** call this RPC today: after sign-up it shows «Аккаунт создан. Мы настроим компанию» (`src/pages/ProfileNotConfigured.tsx`) and the company is set up by hand. Migrations, RLS and the function body are Codex's.

## Why

The landing form creates an account with `supabase.auth.signUp({ email, password })`. A new user has no `profiles` row (or one without `company_id`), so `isProfileConfigured()` is false and the app cannot route them anywhere. The owner should land on an empty project list of their own company right after sign-up.

## RPC

```sql
create_company_and_profile(
  p_company_name text,      -- may be null: default to the e-mail domain or «Моя компания»
  p_full_name    text,      -- may be null
  p_locale       text       -- 'et' | 'ru' | 'en', written to profiles.locale
) returns uuid              -- the new companies.id
```

Rules (server side, one transaction, `security definer`, `auth.uid()` only):

1. If the caller already has a profile with a `company_id`, return that `company_id` and change nothing (idempotent: the UI may call it twice after a retry).
2. Otherwise insert `companies(name)` and upsert `profiles(id = auth.uid(), company_id, full_name, role = 'gc', locale)`.
3. Never accept a role or company id from the client. A self sign-up is always `gc` of a new company. Workers, foremen and clients join by invitation (worker links, C3), never by this function.
4. Start the trial: whatever the billing tables need for «30 дней бесплатно, без карты» (see `src/config/pricing.ts`). If billing is not modelled yet, leave it out and say so here.

## What the UI will do once it exists

- After `signUp` returns a session: call `create_company_and_profile(null, null, currentLocale())`, then `refreshProfile()`, then go to `/dashboard` (empty state «Заведите первый объект»).
- When sign-up returns no session (e-mail confirmation is on), call it on the first sign-in where the profile is not configured.
- On error: keep the current «Аккаунт создан. Мы настроим компанию» screen with «Проверить снова».

## Open questions for Codex

1. Is e-mail confirmation switched off in Supabase Auth until we have our own SMTP? With it on, the default Supabase mail sends a confirmation link the landing no longer mentions.
2. Should the company name be asked in the form (one more field) or edited later in settings? Proposal: later, to keep sign-up to two fields.
3. Rate limit / abuse: is Supabase's built-in sign-up rate limit enough for now?
