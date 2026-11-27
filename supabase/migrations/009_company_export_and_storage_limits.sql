-- Free company export and server-enforced storage limits.
-- Keep these values aligned with src/config/pricing.ts: capMaxObjects=10, capStorageGb=50.

create table public.company_export_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  format text not null check (format in ('json','csv')),
  outcome text not null default 'started' check (outcome in ('started','completed','failed')),
  bytes_exported bigint,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index company_export_log_rate_idx on public.company_export_log(company_id,created_at desc);
alter table public.company_export_log enable row level security;
revoke all on public.company_export_log from public,anon,authenticated;
grant select on public.company_export_log to service_role;

create or replace function public.begin_company_export(p_company_id uuid,p_actor_id uuid,p_format text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if p_format not in ('json','csv') then raise exception 'invalid_export_format'; end if;
  if not exists(select 1 from public.profiles where id=p_actor_id and company_id=p_company_id and role='gc') then
    raise exception 'forbidden';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('company-export:'||p_company_id::text,0));
  if (select count(*) from public.company_export_log where company_id=p_company_id and created_at>now()-interval '1 hour')>=5 then
    raise exception 'export_rate_limit';
  end if;
  insert into public.company_export_log(company_id,requested_by,format) values(p_company_id,p_actor_id,p_format) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.begin_company_export(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.begin_company_export(uuid,uuid,text) to service_role;

create or replace function public.finish_company_export(p_export_id uuid,p_actor_id uuid,p_outcome text,p_bytes bigint default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if p_outcome not in ('completed','failed') or (p_bytes is not null and p_bytes<0) then raise exception 'invalid_export_result'; end if;
  update public.company_export_log l set outcome=p_outcome,bytes_exported=case when p_outcome='completed' then p_bytes else null end,finished_at=now()
    where l.id=p_export_id and l.requested_by=p_actor_id
      and exists(select 1 from public.profiles p where p.id=p_actor_id and p.company_id=l.company_id and p.role='gc');
  if not found then raise exception 'export_not_found'; end if;
end $$;
revoke all on function public.finish_company_export(uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.finish_company_export(uuid,uuid,text,bigint) to service_role;

create or replace function public.company_storage_usage(p_company_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public,storage as $$
declare v_bytes bigint; v_projects integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.profiles where id=p_actor_id and company_id=p_company_id and role='gc') then raise exception 'forbidden'; end if;
  select count(*)::integer into v_projects from public.projects where company_id=p_company_id and status='active';
  select coalesce(sum(case when (o.metadata->>'size') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end),0)::bigint into v_bytes
  from storage.objects o join public.projects p on p.id::text=split_part(o.name,'/',1)
  where o.bucket_id='project-photos' and p.company_id=p_company_id;
  return jsonb_build_object('company_id',p_company_id,'used_bytes',v_bytes,'used_gb',round(v_bytes::numeric/1000000000,3),
    'active_projects',v_projects,'max_bytes',50000000000,'max_active_projects',10,
    'storage_limit_exceeded',v_bytes>50000000000,'project_limit_exceeded',v_projects>10);
end $$;
revoke all on function public.company_storage_usage(uuid,uuid) from public,anon,authenticated;
grant execute on function public.company_storage_usage(uuid,uuid) to service_role;

create or replace function public.export_company_data(p_company_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.profiles where id=p_actor_id and company_id=p_company_id and role='gc') then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'company',to_jsonb(c),
    'projects',coalesce((select jsonb_agg(jsonb_build_object(
      'project',to_jsonb(p),
      'stages',coalesce((select jsonb_agg(to_jsonb(ps)||jsonb_build_object('stage_name',st.name) order by st.sort_order)
        from public.project_stages ps join public.stage_templates st on st.id=ps.stage_template_id where ps.project_id=p.id),'[]'::jsonb),
      'reports',coalesce((select jsonb_agg(jsonb_build_object('report',to_jsonb(sr),'history',coalesce((
        select jsonb_agg(to_jsonb(sh) order by sh.changed_at,sh.id) from public.stage_history sh where sh.report_id=sr.id
      ),'[]'::jsonb),'photos',coalesce((select jsonb_agg(to_jsonb(ph) order by ph.uploaded_at,ph.id)
        from public.photos ph where ph.report_id=sr.id),'[]'::jsonb)) order by sr.created_at,sr.id)
        from public.stage_reports sr where sr.project_id=p.id),'[]'::jsonb),
      'history',coalesce((select jsonb_agg(to_jsonb(sh) order by sh.changed_at,sh.id) from public.stage_history sh
        join public.project_stages ps on ps.id=sh.project_stage_id where ps.project_id=p.id),'[]'::jsonb),
      'issues',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at,i.id) from public.issues i where i.project_id=p.id),'[]'::jsonb),
      'tasks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at,t.id) from public.tasks t where t.project_id=p.id),'[]'::jsonb),
      'photos',coalesce((select jsonb_agg(to_jsonb(ph) order by ph.uploaded_at,ph.id) from public.photos ph where ph.project_id=p.id),'[]'::jsonb)
    ) order by p.created_at,p.id) from public.projects p where p.company_id=p_company_id),'[]'::jsonb)
  ) into v_result from public.companies c where c.id=p_company_id;
  if v_result is null then raise exception 'company_not_found'; end if;
  return v_result;
end $$;
revoke all on function public.export_company_data(uuid,uuid) from public,anon,authenticated;
grant execute on function public.export_company_data(uuid,uuid) to service_role;

-- The first path segment is the project UUID, as used by every project photo upload.
-- Serialize writes by firm so simultaneous uploads cannot both pass the remaining quota.
create or replace function public.enforce_company_storage_limit()
returns trigger language plpgsql security definer set search_path=public,storage as $$
declare v_project public.projects%rowtype; v_bytes bigint; v_new_size bigint; v_projects integer;
begin
  if new.bucket_id<>'project-photos' then return new; end if;
  if split_part(new.name,'/',1)!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception using message='invalid_project_storage_path';
  end if;
  select * into v_project from public.projects where id=split_part(new.name,'/',1)::uuid;
  if not found then raise exception using message='project_not_found'; end if;
  v_new_size:=case when (new.metadata->>'size')~'^[0-9]+$' then (new.metadata->>'size')::bigint else null end;
  if v_new_size is null or v_new_size<1 then raise exception using message='invalid_upload_size'; end if;
  perform pg_advisory_xact_lock(hashtextextended('company-storage:'||v_project.company_id::text,0));
  select count(*)::integer into v_projects from public.projects where company_id=v_project.company_id and status='active';
  if v_projects>10 then raise exception using message='company_project_limit_exceeded'; end if;
  select coalesce(sum(case when (o.metadata->>'size')~'^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end),0)::bigint into v_bytes
    from storage.objects o join public.projects p on p.id::text=split_part(o.name,'/',1)
    where o.bucket_id='project-photos' and p.company_id=v_project.company_id;
  if v_bytes+v_new_size>50000000000 then raise exception using message='company_storage_limit_exceeded'; end if;
  return new;
end $$;
revoke all on function public.enforce_company_storage_limit() from public,anon,authenticated;
drop trigger if exists company_storage_limit_before_insert on storage.objects;
create trigger company_storage_limit_before_insert before insert on storage.objects
for each row execute function public.enforce_company_storage_limit();

notify pgrst,'reload schema';
