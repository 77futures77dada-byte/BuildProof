-- 007 rollback. Worker-submitted report rows cannot be retained after dropping
-- worker_link_id/reporter_id nullability; remove their dependent records first.
drop function if exists public.submit_worker_link_report(text,uuid,integer,timestamptz,timestamptz,text[],text,uuid,text);
drop function if exists public.worker_link_reports(text,integer);
drop function if exists public.worker_link_stages(text);
drop function if exists public.authorize_worker_link(text);
drop function if exists public.revoke_worker_link(uuid,uuid);
drop function if exists public.create_worker_link(uuid,uuid,text,text,timestamptz);
delete from public.photos where report_id in (select id from public.stage_reports where worker_link_id is not null);
delete from public.stage_history where report_id in (select id from public.stage_reports where worker_link_id is not null);
delete from public.stage_reports where worker_link_id is not null;
alter table public.stage_reports alter column reporter_id set not null;
drop index if exists public.stage_reports_worker_link_recent_idx;
alter table public.stage_reports drop column if exists worker_link_id;
alter table public.stage_reports drop column if exists claimed_percent;
alter table public.stage_reports drop column if exists previous_confirmed_percent;
alter table public.stage_reports drop column if exists taken_at;
alter table public.stage_reports drop column if exists device_time;
alter table public.stage_reports drop column if exists uploaded_at;
alter table public.stage_reports drop column if exists phash;
alter table public.stage_reports drop column if exists duplicate_of;
alter table public.stage_reports drop column if exists client_request_id;
alter table public.stage_reports drop column if exists decrease_reason;
alter table public.stage_history drop column if exists reason;
drop table if exists public.worker_links;
-- Restore review_stage_reports(uuid[]) and review_stage_report(uuid,boolean,text)
-- definitions from 006 to return the permitted reviewer role to foreman only.
create or replace function public.review_stage_reports(p_report_ids uuid[])
returns integer language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_role public.user_role; v_count integer; v_requested integer;
begin
  select role into v_role from public.profiles where id=v_uid;
  if v_uid is null or v_role is distinct from 'foreman' then raise exception 'forbidden'; end if;
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
    where sr.id=any(p_report_ids) and sr.status='accepted' and sr.reporter_id<>v_uid;
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
  if v_uid is null or v_role is distinct from 'foreman' then raise exception 'forbidden'; end if;
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
    return 'confirmed';
  end if;
  update public.stage_reports set status='rejected',reviewed_by=v_uid,reviewed_at=now(),review_note=nullif(btrim(p_note),'')
    where id=p_report_id;
  return 'rejected';
end $$;
revoke all on function public.review_stage_report(uuid,boolean,text) from public,anon;
grant execute on function public.review_stage_report(uuid,boolean,text) to authenticated;
