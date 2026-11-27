create extension if not exists pgcrypto with schema extensions;

-- Let the firm's owner make the same report-review decisions as a foreman.
create or replace function public.review_stage_reports(p_report_ids uuid[])
returns integer language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_role public.user_role; v_count integer; v_requested integer;
begin
  select role into v_role from public.profiles where id=v_uid;
  if v_uid is null or v_role is null or v_role not in ('foreman','gc') then raise exception 'forbidden'; end if;
  if p_report_ids is null or cardinality(p_report_ids)=0 then raise exception 'empty_report_batch'; end if;
  if cardinality(p_report_ids)>100 then raise exception 'batch_too_large'; end if;
  v_requested:=cardinality(p_report_ids);
  if (select count(distinct x) from unnest(p_report_ids) x)<>v_requested then raise exception 'duplicate_report'; end if;
  if exists(select 1 from public.stage_reports sr join public.projects p on p.id=sr.project_id
    where sr.id=any(p_report_ids) and (sr.status<>'accepted' or sr.reporter_id=v_uid
      or sr.new_percent-sr.old_percent<0 or sr.new_percent-sr.old_percent>p.review_threshold
      or sr.project_id not in (select pr.id from public.projects pr where pr.company_id=public.current_user_company_id()))) then
    raise exception 'report_not_reviewable';
  end if;
  if (select count(*) from public.stage_reports where id=any(p_report_ids))<>v_requested then raise exception 'report_not_found'; end if;
  update public.stage_reports sr set status='confirmed',confirmed_percent=sr.new_percent,reviewed_by=v_uid,reviewed_at=now()
    where sr.id=any(p_report_ids) and sr.status='accepted' and sr.reporter_id is distinct from v_uid;
  get diagnostics v_count=row_count;
  if v_count<>v_requested then raise exception 'report_not_reviewable'; end if;
  return v_count;
end $$;
revoke all on function public.review_stage_reports(uuid[]) from public,anon;
grant execute on function public.review_stage_reports(uuid[]) to authenticated;

create or replace function public.review_stage_report(p_report_id uuid,p_confirm boolean,p_note text default null)
returns text language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_role public.user_role; v_report public.stage_reports%rowtype;
begin
  select role into v_role from public.profiles where id=v_uid;
  if v_uid is null or v_role is null or v_role not in ('foreman','gc') then raise exception 'forbidden'; end if;
  select * into v_report from public.stage_reports where id=p_report_id for update;
  if not found or v_report.project_id not in
    (select p.id from public.projects p where p.company_id=public.current_user_company_id()) then raise exception 'report_not_found'; end if;
  if v_report.reporter_id=v_uid then raise exception 'self_review_forbidden'; end if;
  if v_report.status<>'pending' then raise exception 'report_not_reviewable'; end if;
  if p_confirm then
    update public.stage_reports set status='confirmed',confirmed_percent=new_percent,reviewed_by=v_uid,reviewed_at=now(),review_note=null
      where id=p_report_id;
    update public.project_stages set progress_percent=v_report.new_percent,updated_at=now(),updated_by=v_uid
      where id=v_report.project_stage_id;
    insert into public.stage_history(project_stage_id,old_percent,new_percent,changed_by,report_id,reason)
      select v_report.project_stage_id,v_report.old_percent,v_report.new_percent,v_uid,v_report.id,v_report.decrease_reason
      where not exists(select 1 from public.stage_history where report_id=v_report.id);
    return 'confirmed';
  end if;
  update public.stage_reports set status='rejected',reviewed_by=v_uid,reviewed_at=now(),review_note=nullif(btrim(p_note),'')
    where id=p_report_id;
  return 'rejected';
end $$;
revoke all on function public.review_stage_report(uuid,boolean,text) from public,anon;
grant execute on function public.review_stage_report(uuid,boolean,text) to authenticated;

create table public.worker_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  check (expires_at>created_at and expires_at<=created_at+interval '90 days')
);
create index worker_links_project_active_idx on public.worker_links(project_id,expires_at) where revoked_at is null;
alter table public.worker_links enable row level security;
revoke all on public.worker_links from public,anon,authenticated;
grant select on public.worker_links to service_role;

alter table public.stage_reports alter column reporter_id drop not null;
alter table public.stage_reports
  add column worker_link_id uuid references public.worker_links(id) on delete set null,
  add column claimed_percent integer check (claimed_percent between 0 and 100),
  add column previous_confirmed_percent integer check (previous_confirmed_percent between 0 and 100),
  add column taken_at timestamptz,
  add column device_time timestamptz,
  add column uploaded_at timestamptz not null default now(),
  add column phash text check (phash is null or phash ~ '^[0-9a-fA-F]{16,128}$'),
  add column duplicate_of uuid references public.stage_reports(id) on delete set null,
  add column client_request_id uuid unique,
  add column decrease_reason text check (decrease_reason is null or decrease_reason in ('rework','count_error','demolition'));
alter table public.stage_history add column reason text;
create index stage_reports_worker_link_recent_idx on public.stage_reports(worker_link_id,created_at desc) where worker_link_id is not null;

create or replace function public.create_worker_link(
  p_project_id uuid,p_created_by uuid,p_display_name text,p_token_hash text,p_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid; v_id uuid; v_owner_email text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  select company_id into v_company from public.projects where id=p_project_id;
  select u.email into v_owner_email from public.profiles pr join auth.users u on u.id=pr.id
    where pr.id=p_created_by and pr.role='gc' and pr.company_id=v_company;
  if v_company is null or v_owner_email is null then raise exception 'forbidden'; end if;
  perform public.assert_company_email(v_company,v_owner_email);
  if length(btrim(p_display_name)) not between 1 and 80 then raise exception 'invalid_display_name'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token_hash'; end if;
  if p_expires_at<=now() or p_expires_at>now()+interval '90 days' then raise exception 'invalid_expiry'; end if;
  if (select count(*) from public.worker_links where project_id=p_project_id and revoked_at is null and expires_at>now())>=100 then raise exception 'worker_link_limit'; end if;
  insert into public.worker_links(project_id,created_by,display_name,token_hash,expires_at)
    values(p_project_id,p_created_by,btrim(p_display_name),p_token_hash,p_expires_at) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_worker_link(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.create_worker_link(uuid,uuid,text,text,timestamptz) to service_role;

create or replace function public.revoke_worker_link(p_link_id uuid,p_company_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  update public.worker_links wl set revoked_at=coalesce(wl.revoked_at,now())
  from public.projects p where wl.id=p_link_id and p.id=wl.project_id and p.company_id=p_company_id;
  return found;
end $$;
revoke all on function public.revoke_worker_link(uuid,uuid) from public,anon,authenticated;
grant execute on function public.revoke_worker_link(uuid,uuid) to service_role;

create or replace function public.authorize_worker_link(p_token text)
returns table(link_id uuid,project_id uuid,display_name text)
language plpgsql security definer set search_path=public,extensions as $$
declare v_link public.worker_links%rowtype;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  update public.worker_links wl set last_used_at=now()
    where wl.token_hash=encode(digest(p_token,'sha256'),'hex') and wl.revoked_at is null and wl.expires_at>now()
    returning wl.* into v_link;
  if not found then raise exception 'invalid_worker_link'; end if;
  return query select v_link.id,v_link.project_id,v_link.display_name;
end $$;
revoke all on function public.authorize_worker_link(text) from public,anon,authenticated;
grant execute on function public.authorize_worker_link(text) to service_role;

create or replace function public.worker_link_stages(p_token text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_link public.worker_links%rowtype; v_result jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  update public.worker_links wl set last_used_at=now() where wl.token_hash=encode(digest(p_token,'sha256'),'hex')
    and wl.revoked_at is null and wl.expires_at>now() returning wl.* into v_link;
  if not found then raise exception 'invalid_worker_link'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',ps.id,'name',st.name,'progress_percent',ps.progress_percent)
    order by st.sort_order),'[]'::jsonb) into v_result
  from public.project_stages ps join public.stage_templates st on st.id=ps.stage_template_id
  where ps.project_id=v_link.project_id;
  return jsonb_build_object('project_id',v_link.project_id,'worker_name',v_link.display_name,'stages',v_result);
end $$;
revoke all on function public.worker_link_stages(text) from public,anon,authenticated;
grant execute on function public.worker_link_stages(text) to service_role;

create or replace function public.worker_link_reports(p_token text,p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_link public.worker_links%rowtype; v_result jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  update public.worker_links wl set last_used_at=now() where wl.token_hash=encode(digest(p_token,'sha256'),'hex')
    and wl.revoked_at is null and wl.expires_at>now() returning wl.* into v_link;
  if not found then raise exception 'invalid_worker_link'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',sr.id,'stage_id',sr.project_stage_id,
    'claimed_percent',coalesce(sr.claimed_percent,sr.new_percent),'status',sr.status,'created_at',sr.created_at,
    'taken_at',sr.taken_at,'device_time',sr.device_time,'uploaded_at',sr.uploaded_at,
    'photos',(select coalesce(jsonb_agg(ph.storage_path),'[]'::jsonb) from public.photos ph where ph.report_id=sr.id))
    order by sr.created_at desc),'[]'::jsonb) into v_result
  from (select * from public.stage_reports where worker_link_id=v_link.id order by created_at desc limit least(greatest(coalesce(p_limit,20),1),50)) sr;
  return v_result;
end $$;
revoke all on function public.worker_link_reports(text,integer) from public,anon,authenticated;
grant execute on function public.worker_link_reports(text,integer) to service_role;

create or replace function public.submit_worker_link_report(
  p_token text,p_stage_id uuid,p_claimed_percent integer,p_taken_at timestamptz,p_device_time timestamptz,
  p_photo_paths text[],p_phash text,p_client_request_id uuid,p_decrease_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_link public.worker_links%rowtype; v_project_id uuid; v_old integer; v_threshold integer;
  v_status text; v_report_id uuid; v_duplicate uuid; v_count integer; v_paths text[]:=coalesce(p_photo_paths,'{}'::text[]);
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  select * into v_link from public.worker_links wl where wl.token_hash=encode(digest(p_token,'sha256'),'hex')
    and wl.revoked_at is null and wl.expires_at>now() for update;
  if not found then raise exception 'invalid_worker_link'; end if;
  if p_claimed_percent is null or p_claimed_percent not between 0 and 100 then raise exception 'invalid_percent'; end if;
  if p_device_time is null then raise exception 'device_time_required'; end if;
  if cardinality(v_paths)<1 or cardinality(v_paths)>5 then raise exception 'invalid_photo_count'; end if;
  if p_client_request_id is null then raise exception 'client_request_id_required'; end if;
  if p_phash is not null and p_phash !~ '^[0-9a-fA-F]{16,128}$' then raise exception 'invalid_phash'; end if;
  if exists(select 1 from unnest(v_paths) path where path is null or path !~ ('^' || v_link.project_id::text || '/worker-links/' || v_link.id::text || '/.+')) then
    raise exception 'invalid_photo_path';
  end if;
  select ps.project_id,ps.progress_percent,p.review_threshold into v_project_id,v_old,v_threshold
    from public.project_stages ps join public.projects p on p.id=ps.project_id
    where ps.id=p_stage_id and ps.project_id=v_link.project_id for update of ps;
  if not found then raise exception 'stage_not_found'; end if;
  select sr.id into v_report_id from public.stage_reports sr where sr.worker_link_id=v_link.id and sr.client_request_id=p_client_request_id;
  if v_report_id is not null then return jsonb_build_object('report_id',v_report_id,'duplicate_request',true); end if;
  select count(*) into v_count from public.stage_reports sr where sr.worker_link_id=v_link.id and sr.created_at>now()-interval '1 hour';
  if v_count>=10 then raise exception 'worker_link_rate_limit'; end if;
  if p_claimed_percent<v_old and (p_decrease_reason is null or p_decrease_reason not in ('rework','count_error','demolition')) then raise exception 'decrease_reason_required'; end if;
  if p_claimed_percent>=v_old and p_decrease_reason is not null then raise exception 'invalid_decrease_reason'; end if;
  v_status:=case when abs(p_claimed_percent-v_old)>v_threshold then 'pending' else 'accepted' end;
  if p_phash is not null then
    select sr.id into v_duplicate from public.stage_reports sr where sr.project_id=v_project_id and sr.phash=p_phash limit 1;
  end if;
  insert into public.stage_reports(project_stage_id,project_id,reporter_id,worker_link_id,old_percent,new_percent,
    claimed_percent,previous_confirmed_percent,status,confirmed_percent,taken_at,device_time,uploaded_at,phash,duplicate_of,client_request_id,decrease_reason)
  values(p_stage_id,v_project_id,null,v_link.id,v_old,p_claimed_percent,p_claimed_percent,v_old,v_status,
    case when v_status='accepted' then p_claimed_percent else v_old end,p_taken_at,p_device_time,now(),p_phash,v_duplicate,p_client_request_id,p_decrease_reason)
  returning id into v_report_id;
  if v_status='accepted' then update public.project_stages set progress_percent=p_claimed_percent,updated_at=now() where id=p_stage_id; end if;
  if v_status='accepted' then
    insert into public.stage_history(project_stage_id,old_percent,new_percent,changed_by,report_id,reason)
      values(p_stage_id,v_old,p_claimed_percent,null,v_report_id,p_decrease_reason);
  end if;
  insert into public.photos(project_id,project_stage_id,storage_path,uploaded_by,report_id)
    select v_project_id,p_stage_id,path,null,v_report_id from unnest(v_paths) path;
  update public.worker_links set last_used_at=now() where id=v_link.id;
  return jsonb_build_object('report_id',v_report_id,'status',v_status,'duplicate_of',v_duplicate,'duplicate_request',false);
end $$;
revoke all on function public.submit_worker_link_report(text,uuid,integer,timestamptz,timestamptz,text[],text,uuid,text) from public,anon,authenticated;
grant execute on function public.submit_worker_link_report(text,uuid,integer,timestamptz,timestamptz,text[],text,uuid,text) to service_role;

notify pgrst,'reload schema';
