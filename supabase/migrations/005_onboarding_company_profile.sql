begin;

-- Keep a newly authenticated user out of the "profile not configured" state.
-- The database role `gc` is the app's current owner/manager role.
drop trigger if exists buildproof_profile_after_auth_signup on auth.users;
drop function if exists public.bootstrap_profile_for_new_auth_user();

-- Replace the earlier two-argument version. The third argument has a default,
-- so existing two-argument calls continue to resolve to this function.
drop function if exists public.create_company_and_profile(text, text);

create or replace function public.create_company_and_profile(
  p_company_name text,
  p_full_name text default null,
  p_locale text default 'ru'
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
  v_locale text := coalesce(nullif(btrim(p_locale), ''), 'ru');
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if v_company_name is null then
    v_company_name := coalesce(
      nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2), ''),
      'Моя компания'
    );
  end if;
  if v_locale not in ('et', 'ru', 'en') then
    raise exception 'invalid_locale';
  end if;
  if length(v_company_name) > 120 then
    raise exception 'invalid_company_name';
  end if;

  -- Serialize retries for the same account before checking its profile.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select p.company_id into v_company_id
  from public.profiles p
  where p.id = v_user_id;
  if found and v_company_id is not null then
    return v_company_id;
  end if;

  insert into public.companies(name) values (v_company_name)
  returning id into v_company_id;

  insert into public.profiles as existing_profile(id, company_id, full_name, role, locale)
  values (
    v_user_id,
    v_company_id,
    coalesce(v_full_name, nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), '')),
    'gc',
    v_locale
  )
  on conflict (id) do update set
    company_id = excluded.company_id,
    full_name = coalesce(excluded.full_name, existing_profile.full_name),
    role = 'gc',
    locale = excluded.locale;

  return v_company_id;
end;
$$;
revoke all on function public.create_company_and_profile(text, text, text) from public, anon;
grant execute on function public.create_company_and_profile(text, text, text) to authenticated;

notify pgrst, 'reload schema';

do $$
declare
  v_rpc oid := 'public.create_company_and_profile(text,text,text)'::regprocedure;
begin
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
where p.oid = 'public.create_company_and_profile(text,text,text)'::regprocedure;
