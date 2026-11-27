-- Run only when rolling back 006. Restore the pre-006 RPC definitions from
-- migrations/002_stage_reports_activity_metrics.sql, 003_invite_api_support.sql,
-- and 005_onboarding_company_profile.sql before dropping these additive fields.
drop function if exists public.review_stage_reports(uuid[]);
drop function if exists public.review_stage_report(uuid,boolean,text);
create or replace function public.current_user_company_id()
returns uuid language sql stable security definer set search_path=public
as $$ select company_id from public.profiles where id=auth.uid() $$;
create or replace function public.has_project_access(p_project_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and (
    exists(select 1 from public.projects p where p.id=p_project_id and p.company_id=public.current_user_company_id()
      and public.current_user_role()='gc')
    or exists(select 1 from public.project_access a where a.project_id=p_project_id and a.user_id=auth.uid())
  )
$$;
drop function if exists public.assert_company_email(uuid,text);
drop function if exists public.company_email_domain(uuid);
drop function if exists public.is_public_email_domain(text);
drop table if exists public.public_email_domains;
alter table public.stage_reports drop column if exists review_note;
alter table public.stage_reports drop column if exists reviewed_at;
alter table public.stage_reports drop column if exists reviewed_by;
alter table public.stage_reports drop column if exists confirmed_percent;
alter table public.stage_reports drop column if exists status;
drop index if exists public.stage_reports_review_queue_idx;
alter table public.projects drop column if exists review_threshold;
-- Reapply source RPC bodies in order 002, 003, 005 (report submit, invite
-- reservation, onboarding) after this script. The helper RPC definitions above
-- restore the originals from 000_baseline.sql.
