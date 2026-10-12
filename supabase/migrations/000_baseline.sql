-- Reproducible baseline for the schema currently consumed by the BuildProof UI.
-- Security hardening and additive features live in later migrations.
create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('client', 'gc', 'foreman', 'worker');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.project_status as enum ('active', 'paused', 'completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.issue_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.issue_status as enum ('open', 'in_progress', 'resolved');
exception when duplicate_object then null; end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(), name text not null
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id), full_name text,
  role public.user_role not null default 'worker'
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  name text not null, address text, deadline date, budget numeric,
  status public.project_status not null default 'active', created_at timestamptz not null default now()
);
create table if not exists public.project_access (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (project_id, user_id)
);
create table if not exists public.stage_templates (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  sort_order integer not null unique
);
create table if not exists public.project_stages (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  stage_template_id uuid not null references public.stage_templates(id),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id),
  unique (project_id, stage_template_id)
);
create table if not exists public.stage_history (
  id uuid primary key default gen_random_uuid(), project_stage_id uuid not null references public.project_stages(id) on delete cascade,
  old_percent integer not null, new_percent integer not null,
  changed_by uuid references public.profiles(id), changed_at timestamptz not null default now()
);
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  project_stage_id uuid references public.project_stages(id) on delete set null,
  storage_path text not null, caption text, uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  project_stage_id uuid references public.project_stages(id) on delete set null,
  title text not null, assigned_to uuid references public.profiles(id), deadline date,
  status public.task_status not null default 'todo', created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, description text, photo_path text, priority public.issue_priority not null default 'medium',
  responsible_party text, status public.issue_status not null default 'open', due_date date,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);

insert into public.stage_templates(name, sort_order) values
 ('Фундамент',1),('Каркас',2),('Кровля',3),('Окна',4),('Электрика',5),('Сантехника',6),('Отделка',7)
on conflict (name) do nothing;

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;
create or replace function public.current_user_company_id()
returns uuid language sql stable security definer set search_path = public
as $$ select company_id from public.profiles where id = auth.uid() $$;
create or replace function public.has_project_access(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and (
    exists(select 1 from public.projects p where p.id=p_project_id and p.company_id=public.current_user_company_id()
      and public.current_user_role()='gc')
    or exists(select 1 from public.project_access a where a.project_id=p_project_id and a.user_id=auth.uid())
  )
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_access enable row level security;
alter table public.stage_templates enable row level security;
alter table public.project_stages enable row level security;
alter table public.stage_history enable row level security;
alter table public.photos enable row level security;
alter table public.tasks enable row level security;
alter table public.issues enable row level security;

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated using (id=public.current_user_company_id());
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using
 (id=auth.uid() or company_id=public.current_user_company_id());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated using (public.has_project_access(id));
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated with check
 (company_id=public.current_user_company_id() and public.current_user_role()='gc');
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated using
 (company_id=public.current_user_company_id() and public.current_user_role()='gc') with check
 (company_id=public.current_user_company_id() and public.current_user_role()='gc');
drop policy if exists project_access_select on public.project_access;
create policy project_access_select on public.project_access for select to authenticated using (public.has_project_access(project_id));
drop policy if exists project_access_write on public.project_access;
create policy project_access_write on public.project_access for all to authenticated using
 (public.current_user_role()='gc' and exists(select 1 from public.projects p where p.id=project_id and p.company_id=public.current_user_company_id()))
 with check (public.current_user_role()='gc' and exists(select 1 from public.projects p where p.id=project_id and p.company_id=public.current_user_company_id()));
drop policy if exists stage_templates_select on public.stage_templates;
create policy stage_templates_select on public.stage_templates for select to anon, authenticated using (true);
drop policy if exists stages_select on public.project_stages;
create policy stages_select on public.project_stages for select to authenticated using (public.has_project_access(project_id));
drop policy if exists stages_write on public.project_stages;
create policy stages_write on public.project_stages for all to authenticated using
 (public.has_project_access(project_id) and public.current_user_role() in ('gc','foreman')) with check
 (public.has_project_access(project_id) and public.current_user_role() in ('gc','foreman'));
drop policy if exists stage_history_select on public.stage_history;
create policy stage_history_select on public.stage_history for select to authenticated using
 (exists(select 1 from public.project_stages s where s.id=project_stage_id and public.has_project_access(s.project_id)));
drop policy if exists stage_history_insert on public.stage_history;
create policy stage_history_insert on public.stage_history for insert to authenticated with check
 (changed_by=auth.uid() and exists(select 1 from public.project_stages s where s.id=project_stage_id and public.has_project_access(s.project_id)));
drop policy if exists photos_select on public.photos;
create policy photos_select on public.photos for select to authenticated using (public.has_project_access(project_id));
drop policy if exists photos_insert on public.photos;
create policy photos_insert on public.photos for insert to authenticated with check
 (uploaded_by=auth.uid() and public.has_project_access(project_id));
drop policy if exists photos_delete on public.photos;
create policy photos_delete on public.photos for delete to authenticated using
 (public.current_user_role()='gc' or uploaded_by=auth.uid());
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated using (public.has_project_access(project_id));
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated with check
 (created_by=auth.uid() and public.has_project_access(project_id) and public.current_user_role() in ('gc','foreman'));
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated using
 (public.has_project_access(project_id) and (public.current_user_role() in ('gc','foreman') or assigned_to=auth.uid())) with check
 (public.has_project_access(project_id));
drop policy if exists issues_select on public.issues;
create policy issues_select on public.issues for select to authenticated using (public.has_project_access(project_id));
drop policy if exists issues_insert on public.issues;
create policy issues_insert on public.issues for insert to authenticated with check
 (created_by=auth.uid() and public.has_project_access(project_id));
drop policy if exists issues_update on public.issues;
create policy issues_update on public.issues for update to authenticated using
 (public.has_project_access(project_id) and public.current_user_role() in ('gc','foreman')) with check
 (public.has_project_access(project_id));

grant usage on schema public to anon, authenticated;
grant select on public.stage_templates to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;
grant select on public.companies to authenticated;
grant execute on function public.current_user_role(), public.current_user_company_id(), public.has_project_access(uuid) to authenticated;

create or replace function public.create_project_with_stages(
 p_company_id uuid, p_name text, p_address text default null, p_deadline date default null, p_budget numeric default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_project_id uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if public.current_user_role()<>'gc' or public.current_user_company_id()<>p_company_id then raise exception 'forbidden'; end if;
 insert into public.projects(company_id,name,address,deadline,budget) values(p_company_id,p_name,p_address,p_deadline,p_budget) returning id into v_project_id;
 insert into public.project_stages(project_id,stage_template_id)
 select v_project_id,id from public.stage_templates order by sort_order;
 return v_project_id;
end $$;
grant execute on function public.create_project_with_stages(uuid,text,text,date,numeric) to authenticated;

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
grant execute on function public.update_stage_progress(uuid,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('project-photos','project-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists project_photos_select on storage.objects;
create policy project_photos_select on storage.objects for select to authenticated using
 (bucket_id='project-photos' and (
   case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     then public.has_project_access(((storage.foldername(name))[1])::uuid) else false end
   or exists(select 1 from public.photos ph where ph.storage_path=name and public.has_project_access(ph.project_id))
 ));
drop policy if exists project_photos_insert on storage.objects;
create policy project_photos_insert on storage.objects for insert to authenticated with check
 (bucket_id='project-photos' and array_length(storage.foldername(name),1)>=2
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_project_access(((storage.foldername(name))[1])::uuid));

notify pgrst, 'reload schema';
