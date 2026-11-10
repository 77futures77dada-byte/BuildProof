create table if not exists public.invite_log (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  invited_by uuid not null references public.profiles(id), email text not null, created_at timestamptz not null default now()
);
create index if not exists invite_log_company_created_idx on public.invite_log(company_id,created_at desc);
alter table public.invite_log enable row level security;
drop policy if exists invite_log_select_gc_company on public.invite_log;
create policy invite_log_select_gc_company on public.invite_log for select to authenticated using
 (public.current_user_role()='gc' and company_id=public.current_user_company_id());
revoke insert,update,delete on public.invite_log from anon,authenticated;
grant select on public.invite_log to authenticated;

-- Called only with the service key. A transaction-scoped advisory lock makes
-- the hourly limit reliable when two invitations arrive at the same time.
create or replace function public.reserve_company_invite(p_company_id uuid,p_inviter_id uuid,p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if p_company_id is null or p_inviter_id is null or p_email is null then raise exception 'invalid_invite'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text,0));
  select count(*) into v_count from public.invite_log where company_id=p_company_id and created_at>=now()-interval '1 hour';
  if v_count>=20 then raise exception 'invite_rate_limit'; end if;
  insert into public.invite_log(company_id,invited_by,email) values(p_company_id,p_inviter_id,lower(p_email));
end $$;
revoke all on function public.reserve_company_invite(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_company_invite(uuid,uuid,text) to service_role;

notify pgrst, 'reload schema';
