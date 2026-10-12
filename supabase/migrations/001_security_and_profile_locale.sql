-- C1: close cross-tenant writes and restrict direct stage mutation.
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists project_access_write on public.project_access;
drop policy if exists project_access_insert on public.project_access;
drop policy if exists project_access_delete on public.project_access;
create policy project_access_insert on public.project_access for insert to authenticated with check (
  public.current_user_role()='gc'
  and exists (select 1 from public.projects p where p.id=project_id and p.company_id=public.current_user_company_id())
  and exists (select 1 from public.profiles u where u.id=user_id and u.company_id=public.current_user_company_id())
);
create policy project_access_delete on public.project_access for delete to authenticated using (
  public.current_user_role()='gc'
  and exists (select 1 from public.projects p where p.id=project_id and p.company_id=public.current_user_company_id())
  and exists (select 1 from public.profiles u where u.id=user_id and u.company_id=public.current_user_company_id())
);

revoke insert, update, delete on public.project_stages, public.stage_history from authenticated, anon;
drop policy if exists stages_write on public.project_stages;
drop policy if exists stage_history_insert on public.stage_history;

create or replace function public.update_stage_progress(p_project_stage_id uuid,p_new_percent integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_old integer; v_project uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_new_percent is null or p_new_percent not between 0 and 100 then raise exception 'invalid_percent'; end if;
  select progress_percent,project_id into v_old,v_project from public.project_stages where id=p_project_stage_id for update;
  if not found or not public.has_project_access(v_project) or public.current_user_role() not in ('gc','foreman') then raise exception 'forbidden'; end if;
  if v_old=p_new_percent then return; end if;
  update public.project_stages set progress_percent=p_new_percent,updated_at=now(),updated_by=auth.uid() where id=p_project_stage_id;
  insert into public.stage_history(project_stage_id,old_percent,new_percent,changed_by) values(p_project_stage_id,v_old,p_new_percent,auth.uid());
end $$;

-- Workers can update only status. The trigger also protects against column grants
-- being broadened accidentally in a later migration.
create or replace function public.guard_task_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if public.current_user_role() not in ('gc','foreman') then
    if old.assigned_to is distinct from auth.uid() then raise exception 'forbidden'; end if;
    if (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then
      raise exception 'task_fields_restricted';
    end if;
  end if;
  if not public.has_project_access(new.project_id) then raise exception 'forbidden'; end if;
  return new;
end $$;
drop trigger if exists tasks_guard_update on public.tasks;
create trigger tasks_guard_update before update on public.tasks for each row execute function public.guard_task_update();
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated using (
  public.has_project_access(project_id) and
  (public.current_user_role() in ('gc','foreman') or (public.current_user_role()='worker' and assigned_to=auth.uid()))
) with check (public.has_project_access(project_id));

drop policy if exists photos_insert on public.photos;
create policy photos_insert on public.photos for insert to authenticated with check
  (uploaded_by=auth.uid() and public.has_project_access(project_id) and public.current_user_role() in ('gc','foreman','worker'));
drop policy if exists issues_insert on public.issues;
create policy issues_insert on public.issues for insert to authenticated with check
  (created_by=auth.uid() and public.has_project_access(project_id) and public.current_user_role() in ('gc','foreman','worker'));
drop policy if exists issues_update on public.issues;
create policy issues_update on public.issues for update to authenticated using
  (public.has_project_access(project_id) and public.current_user_role() in ('gc','foreman')) with check
  (public.has_project_access(project_id));

drop policy if exists project_photos_insert on storage.objects;
create policy project_photos_insert on storage.objects for insert to authenticated with check (
  bucket_id='project-photos' and array_length(storage.foldername(name),1)>=2
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.current_user_role() in ('gc','foreman','worker')
  and public.has_project_access(((storage.foldername(name))[1])::uuid)
);
drop policy if exists project_photos_select on storage.objects;
create policy project_photos_select on storage.objects for select to authenticated using (
  bucket_id='project-photos' and (
    case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.has_project_access(((storage.foldername(name))[1])::uuid) else false end
    or exists(select 1 from public.photos ph where ph.storage_path=name and public.has_project_access(ph.project_id))
  )
);
drop policy if exists project_photos_delete on storage.objects;
create policy project_photos_delete on storage.objects for delete to authenticated using (
  bucket_id='project-photos' and (
    (public.current_user_role()='gc' and (
      case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.has_project_access(((storage.foldername(name))[1])::uuid) else false end
      or exists(select 1 from public.photos p where p.storage_path=name and public.has_project_access(p.project_id))
    ))
    or owner_id=auth.uid()::text
    or exists(select 1 from public.photos p where p.storage_path=name and p.uploaded_by=auth.uid())
  )
);
update storage.buckets set file_size_limit=10485760, allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id='project-photos';

-- Ensure all application tables, including future public tables, have RLS.
do $$
declare t record;
begin
  for t in select schemaname, tablename from pg_tables where schemaname='public' loop
    execute format('alter table %I.%I enable row level security', t.schemaname, t.tablename);
  end loop;
  if exists (select 1 from pg_tables t join pg_class c on c.relname=t.tablename
    join pg_namespace n on n.oid=c.relnamespace and n.nspname=t.schemaname
    where t.schemaname='public' and not c.relrowsecurity) then
    raise exception 'A public table has row level security disabled';
  end if;
end $$;

-- C4: user-selectable interface locale.
alter table public.profiles add column if not exists locale text not null default 'ru';
do $$ begin
  alter table public.profiles add constraint profiles_locale_check check (locale in ('et','ru','en'));
exception when duplicate_object then null; end $$;
grant update (locale) on public.profiles to authenticated;

notify pgrst, 'reload schema';
