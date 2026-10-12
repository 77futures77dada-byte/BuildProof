create table if not exists public.stage_reports (
  id uuid primary key default gen_random_uuid(),
  project_stage_id uuid not null references public.project_stages(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id),
  old_percent integer not null check (old_percent between 0 and 100),
  new_percent integer not null check (new_percent between 0 and 100),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.stage_history add column if not exists report_id uuid references public.stage_reports(id) on delete set null;
alter table public.photos add column if not exists report_id uuid references public.stage_reports(id) on delete set null;
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.issues add column if not exists updated_at timestamptz not null default now();
update public.tasks set completed_at=created_at where status='done' and completed_at is null;
create index if not exists stage_reports_project_created_idx on public.stage_reports(project_id,created_at desc);
create index if not exists tasks_project_created_idx on public.tasks(project_id,created_at desc);
create index if not exists issues_project_created_idx on public.issues(project_id,created_at desc);
create index if not exists photos_project_created_idx on public.photos(project_id,uploaded_at desc);
create index if not exists stage_report_photos_report_idx on public.photos(report_id,uploaded_at);
alter table public.stage_reports enable row level security;
drop policy if exists stage_reports_select on public.stage_reports;
create policy stage_reports_select on public.stage_reports for select to authenticated using (public.has_project_access(project_id));
revoke insert, update, delete on public.stage_reports from authenticated, anon;
grant select on public.stage_reports to authenticated;

create or replace function public.set_task_completed_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status='done' and old.status is distinct from 'done' then new.completed_at=now();
  elsif new.status<>'done' then new.completed_at=null;
  end if;
  return new;
end $$;
drop trigger if exists tasks_set_completed_at on public.tasks;
create trigger tasks_set_completed_at before update on public.tasks for each row execute function public.set_task_completed_at();
create or replace function public.set_task_created_completed_at()
returns trigger language plpgsql set search_path = public as $$
begin if new.status='done' and new.completed_at is null then new.completed_at=now(); end if; return new; end $$;
drop trigger if exists tasks_set_created_completed_at on public.tasks;
create trigger tasks_set_created_completed_at before insert on public.tasks for each row execute function public.set_task_created_completed_at();

create or replace function public.submit_stage_report(
  p_project_stage_id uuid, p_new_percent int, p_comment text, p_photo_paths text[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_role public.user_role; v_project uuid; v_old integer;
  v_report_id uuid; v_paths text[] := coalesce(p_photo_paths, array[]::text[]);
  v_comment text := nullif(btrim(p_comment), '');
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select role into v_role from public.profiles where id=v_uid;
  if v_role is null or v_role not in ('gc','foreman','worker') then raise exception 'forbidden'; end if;
  if p_new_percent is null or p_new_percent not between 0 and 100 then raise exception 'invalid_percent'; end if;
  select project_id,progress_percent into v_project,v_old from public.project_stages where id=p_project_stage_id for update;
  if not found or not public.has_project_access(v_project) then raise exception 'forbidden'; end if;
  if exists(select 1 from unnest(v_paths) path where path is null or path !~ ('^' || v_project::text || '/.+')) then
    raise exception 'invalid_photo_path';
  end if;
  if v_role='worker' and p_new_percent>v_old and cardinality(v_paths)<1 then raise exception 'photo_required_for_progress'; end if;
  if p_new_percent<v_old and v_comment is null then raise exception 'comment_required_for_decrease'; end if;
  if p_new_percent=v_old and cardinality(v_paths)=0 and v_comment is null then raise exception 'nothing_to_report'; end if;

  -- Idempotency: compare sorted paths and payload for this author within 10 minutes.
  select sr.id into v_report_id from public.stage_reports sr
  where sr.project_stage_id=p_project_stage_id and sr.reporter_id=v_uid
    and sr.new_percent=p_new_percent and sr.comment is not distinct from v_comment
    and sr.created_at >= now()-interval '10 minutes'
    and (select coalesce(array_agg(ph.storage_path order by ph.storage_path),array[]::text[]) from public.photos ph where ph.report_id=sr.id)
      = (select coalesce(array_agg(path order by path),array[]::text[]) from unnest(v_paths) path)
  order by sr.created_at desc limit 1;
  if v_report_id is not null then return v_report_id; end if;

  update public.project_stages set progress_percent=p_new_percent,updated_at=now(),updated_by=v_uid where id=p_project_stage_id;
  insert into public.stage_reports(project_stage_id,project_id,reporter_id,old_percent,new_percent,comment)
    values(p_project_stage_id,v_project,v_uid,v_old,p_new_percent,v_comment) returning id into v_report_id;
  insert into public.stage_history(project_stage_id,old_percent,new_percent,changed_by,report_id)
    values(p_project_stage_id,v_old,p_new_percent,v_uid,v_report_id);
  insert into public.photos(project_id,project_stage_id,storage_path,caption,uploaded_by,report_id)
    select v_project,p_project_stage_id,path,v_comment,v_uid,v_report_id from unnest(v_paths) path;
  return v_report_id;
end $$;
revoke all on function public.submit_stage_report(uuid,int,text,text[]) from public, anon;
grant execute on function public.submit_stage_report(uuid,int,text,text[]) to authenticated;

create or replace function public.project_activity(p_project_id uuid,p_limit int default 30,p_before timestamptz default null)
returns table(id uuid,kind text,actor_id uuid,actor_name text,stage_name text,title text,detail text,photo_path text,created_at timestamptz)
language sql stable security invoker set search_path = public as $$
  with activity as (
    select sr.id,'stage_report'::text kind,sr.reporter_id actor_id,pr.full_name actor_name,st.name stage_name,
      st.name || ': ' || sr.old_percent || '% → ' || sr.new_percent || '%' title,sr.comment detail,
      (select ph.storage_path from public.photos ph where ph.report_id=sr.id order by ph.uploaded_at,ph.id limit 1) photo_path,sr.created_at
    from public.stage_reports sr join public.profiles pr on pr.id=sr.reporter_id
    join public.project_stages ps on ps.id=sr.project_stage_id join public.stage_templates st on st.id=ps.stage_template_id
    where sr.project_id=p_project_id
    union all
    select t.id,'task_done',t.assigned_to,pr.full_name,null::text,t.title,null::text,null::text,t.completed_at
    from public.tasks t left join public.profiles pr on pr.id=t.assigned_to
    where t.project_id=p_project_id and t.status='done' and t.completed_at is not null
    union all
    select i.id,'issue_created',i.created_by,pr.full_name,null::text,i.title,i.description,i.photo_path,i.created_at
    from public.issues i left join public.profiles pr on pr.id=i.created_by where i.project_id=p_project_id
    union all
    select ph.id,'photo',ph.uploaded_by,pr.full_name,st.name,coalesce(ph.caption,'Photo uploaded'),ph.caption,ph.storage_path,ph.uploaded_at
    from public.photos ph left join public.profiles pr on pr.id=ph.uploaded_by
    left join public.project_stages ps on ps.id=ph.project_stage_id left join public.stage_templates st on st.id=ps.stage_template_id
    where ph.project_id=p_project_id and ph.report_id is null
  )
  select a.id,a.kind,a.actor_id,a.actor_name,a.stage_name,a.title,a.detail,a.photo_path,a.created_at
  from activity a where (p_before is null or a.created_at<p_before)
  order by a.created_at desc limit least(coalesce(p_limit,30),100)
$$;
revoke all on function public.project_activity(uuid,int,timestamptz) from public, anon;
grant execute on function public.project_activity(uuid,int,timestamptz) to authenticated;

create or replace function public.pilot_metrics(p_project_id uuid)
returns table(reports_7d bigint,reports_30d bigint,active_workers_7d bigint,median_delay interval,photo_report_share numeric,last_report_at timestamptz)
language plpgsql stable security invoker set search_path = public as $$
begin
  if auth.uid() is null or public.current_user_role()<>'gc'
     or public.current_user_company_id() is distinct from (select p.company_id from public.projects p where p.id=p_project_id) then
    raise exception 'forbidden';
  end if;
  return query with r as (
    select sr.*,
      (select count(*)>0 from public.photos ph where ph.report_id=sr.id) has_photo,
      lag(sr.created_at) over (order by sr.created_at) previous_at
    from public.stage_reports sr where sr.project_id=p_project_id
  )
  select count(*) filter(where created_at>=now()-interval '7 days'),
    count(*) filter(where created_at>=now()-interval '30 days'),
    count(distinct reporter_id) filter(where created_at>=now()-interval '7 days' and reporter_id in
      (select id from public.profiles where role='worker')),
    percentile_cont(0.5) within group(order by created_at-previous_at) filter(where previous_at is not null),
    coalesce(avg(case when has_photo then 1.0 else 0.0 end),0)::numeric,max(created_at)
  from r;
end $$;
revoke all on function public.pilot_metrics(uuid) from public, anon;
grant execute on function public.pilot_metrics(uuid) to authenticated;

notify pgrst, 'reload schema';
