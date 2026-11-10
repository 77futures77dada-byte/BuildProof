begin;

-- Reassert the production RPC contract in an additive, repeatable migration.
create or replace function public.create_project_with_stages(
  p_company_id uuid,
  p_name text,
  p_address text default null,
  p_deadline date default null,
  p_budget numeric default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if public.current_user_role() is distinct from 'gc'::public.user_role
     or public.current_user_company_id() is distinct from p_company_id then
    raise exception 'forbidden';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'project_name_required';
  end if;

  insert into public.projects(company_id, name, address, deadline, budget)
  values (p_company_id, btrim(p_name), p_address, p_deadline, p_budget)
  returning id into v_project_id;

  insert into public.project_stages(project_id, stage_template_id)
  select v_project_id, st.id
  from public.stage_templates st
  order by st.sort_order;

  return v_project_id;
end;
$$;

revoke all on function public.create_project_with_stages(uuid, text, text, date, numeric)
  from public, anon;
grant execute on function public.create_project_with_stages(uuid, text, text, date, numeric)
  to authenticated;

notify pgrst, 'reload schema';

do $$
declare
  v_function oid := 'public.create_project_with_stages(uuid,text,text,date,numeric)'::regprocedure;
  v_is_definer boolean;
  v_search_path text[];
begin
  select p.prosecdef, p.proconfig
    into v_is_definer, v_search_path
  from pg_proc p where p.oid = v_function;
  if not v_is_definer or not ('search_path=public' = any(v_search_path)) then
    raise exception 'create_project_with_stages security contract check failed';
  end if;
  if has_function_privilege('anon', v_function, 'EXECUTE')
     or not has_function_privilege('authenticated', v_function, 'EXECUTE') then
    raise exception 'create_project_with_stages grant check failed';
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
where p.oid = 'public.create_project_with_stages(uuid,text,text,date,numeric)'::regprocedure;
