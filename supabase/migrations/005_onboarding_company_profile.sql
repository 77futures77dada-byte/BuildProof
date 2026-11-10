begin;

-- Keep a newly authenticated user out of the "profile not configured" state.
-- The database role `gc` is the app's current owner/manager role.
create or replace function public.bootstrap_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_name text;
  v_full_name text;
  v_company_id uuid;
begin
  v_company_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'company_name'), ''),
    nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'New company'
  ), 120);
  v_full_name := nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 120), '');

  insert into public.companies(name) values (v_company_name)
  returning id into v_company_id;

  insert into public.profiles(id, company_id, full_name, role)
  values (new.id, v_company_id, v_full_name, 'gc');

  return new;
end;
$$;
revoke all on function public.bootstrap_profile_for_new_auth_user() from public, anon, authenticated;

drop trigger if exists buildproof_profile_after_auth_signup on auth.users;
create trigger buildproof_profile_after_auth_signup
  after insert on auth.users
  for each row execute function public.bootstrap_profile_for_new_auth_user();

create or replace function public.create_company_and_profile(
  p_company_name text,
  p_full_name text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_company_name text := nullif(btrim(p_company_name), '');
  v_full_name text := nullif(btrim(p_full_name), '');
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if v_company_name is null or length(v_company_name) > 120 then
    raise exception 'invalid_company_name';
  end if;

  -- Serialize retries for the same account before checking its profile.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select p.company_id into v_company_id
  from public.profiles p
  where p.id = v_user_id;
  if found then
    if v_company_id is null then raise exception 'profile_company_missing'; end if;
    return v_company_id;
  end if;

  insert into public.companies(name) values (v_company_name)
  returning id into v_company_id;

  insert into public.profiles(id, company_id, full_name, role)
  values (
    v_user_id,
    v_company_id,
    coalesce(v_full_name, nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), '')),
    'gc'
  );

  return v_company_id;
end;
$$;
revoke all on function public.create_company_and_profile(text, text) from public, anon;
grant execute on function public.create_company_and_profile(text, text) to authenticated;

notify pgrst, 'reload schema';

do $$
declare
  v_rpc oid := 'public.create_company_and_profile(text,text)'::regprocedure;
  v_trigger_exists boolean;
begin
  select exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'buildproof_profile_after_auth_signup'
      and not tgisinternal
  ) into v_trigger_exists;
  if not v_trigger_exists then raise exception 'signup profile trigger check failed'; end if;
  if not (select prosecdef and 'search_path=public' = any(proconfig)
          from pg_proc where oid = v_rpc) then
    raise exception 'onboarding RPC security contract check failed';
  end if;
  if has_function_privilege('anon', v_rpc, 'EXECUTE')
     or not has_function_privilege('authenticated', v_rpc, 'EXECUTE') then
    raise exception 'onboarding RPC grant check failed';
  end if;
end;
$$;

commit;

select p.proname as function_name,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
where p.oid = 'public.create_company_and_profile(text,text)'::regprocedure;
