-- K15: report review fields, threshold, and safe batch confirmation.
alter table public.projects
  add column if not exists review_threshold integer not null default 25
  check (review_threshold between 0 and 100);

alter table public.stage_reports
  add column if not exists status text not null default 'accepted'
    check (status in ('accepted','pending','confirmed','rejected')),
  add column if not exists confirmed_percent integer,
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;
update public.stage_reports set confirmed_percent=new_percent where confirmed_percent is null and status='accepted';
create index if not exists stage_reports_review_queue_idx on public.stage_reports(project_id,created_at)
  where status='pending';

-- The service invite endpoint must verify the recipient belongs to this firm's
-- configured domain. The domain is derived from the firm's owner account.
create table if not exists public.public_email_domains (
  domain text primary key check (domain=lower(domain) and domain !~ '[@[:space:]]'),
  added_at timestamptz not null default now()
);
alter table public.public_email_domains enable row level security;
revoke all on public.public_email_domains from public,anon,authenticated;
insert into public.public_email_domains(domain) values
  ('gmail.com'),('googlemail.com'),('outlook.com'),('hotmail.com'),('live.com'),
  ('yahoo.com'),('icloud.com'),('mail.ru'),('yandex.ru'),('bk.ru'),('inbox.ru'),('list.ru'),
  ('proton.me'),('protonmail.com'),('tut.by'),('mail.ee'),('hot.ee'),('online.ee'),('neti.ee'),('list.ee')
on conflict(domain) do nothing;

create or replace function public.is_public_email_domain(p_domain text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.public_email_domains where domain=lower(p_domain))
$$;
revoke all on function public.is_public_email_domain(text) from public,anon,authenticated;

create or replace function public.company_email_domain(p_company_id uuid)
returns text language sql stable security definer set search_path=public as $$
  select lower(split_part(u.email,'@',2))
  from public.profiles owner_profile join auth.users u on u.id=owner_profile.id
  where owner_profile.company_id=p_company_id and owner_profile.role='gc'
  order by owner_profile.id limit 1
$$;
revoke all on function public.company_email_domain(uuid) from public,anon,authenticated;
grant execute on function public.company_email_domain(uuid) to service_role;

-- Every RLS/RPC path that uses these helpers now rejects a session whose
-- verified JWT email does not belong to its profile's firm domain.
create or replace function public.current_user_company_id()
returns uuid language plpgsql stable security definer set search_path=public as $$
declare v_company_id uuid; v_email text:=lower(coalesce(auth.jwt()->>'email',''));
begin
  select p.company_id into v_company_id from public.profiles p where p.id=auth.uid();
  if v_company_id is null or lower(split_part(v_email,'@',2)) is distinct from public.company_email_domain(v_company_id) then
    return null;
  end if;
  return v_company_id;
end $$;

create or replace function public.has_project_access(p_project_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and public.current_user_company_id() is not null and (
    exists(select 1 from public.projects p where p.id=p_project_id and p.company_id=public.current_user_company_id()
      and public.current_user_role()='gc')
    or exists(select 1 from public.project_access a join public.projects p on p.id=a.project_id
      where a.project_id=p_project_id and a.user_id=auth.uid() and p.company_id=public.current_user_company_id())
  )
$$;

create or replace function public.assert_company_email(p_company_id uuid,p_email text)
returns void language plpgsql stable security definer set search_path=public as $$
declare v_domain text; v_email text:=lower(btrim(p_email));
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;
  v_domain:=public.company_email_domain(p_company_id);
  if v_domain is null then raise exception 'email_not_in_company'; end if;
  if public.is_public_email_domain(v_domain) then
    if v_email is distinct from (select lower(u.email) from public.profiles p join auth.users u on u.id=p.id
      where p.company_id=p_company_id and p.role='gc' order by p.id limit 1)
      and not exists(select 1 from public.invite_log il where il.company_id=p_company_id and lower(il.email)=v_email) then
      raise exception 'email_not_in_company';
    end if;
  elsif public.is_public_email_domain(split_part(v_email,'@',2)) then
    if v_email is distinct from (select lower(u.email) from public.profiles p join auth.users u on u.id=p.id
      where p.company_id=p_company_id and p.role='gc' order by p.id limit 1)
      and not exists(select 1 from public.invite_log il where il.company_id=p_company_id and lower(il.email)=v_email) then
      raise exception 'email_not_in_company';
    end if;
  elsif lower(split_part(v_email,'@',2)) is distinct from v_domain then
    raise exception 'email_not_in_company';
  end if;
end $$;
revoke all on function public.assert_company_email(uuid,text) from public,anon,authenticated;
grant execute on function public.assert_company_email(uuid,text) to service_role;

create or replace function public.current_user_company_id()
returns uuid language plpgsql stable security definer set search_path=public as $$
declare v_company_id uuid;
begin
  select p.company_id into v_company_id from public.profiles p where p.id=auth.uid();
  if v_company_id is null then return null; end if;
  begin
    perform public.assert_company_email(v_company_id,auth.jwt()->>'email');
    return v_company_id;
  exception when raise_exception then
    return null;
  end;
end $$;

create or replace function public.reserve_company_invite(p_company_id uuid,p_inviter_id uuid,p_email text)
returns void language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if p_company_id is null or p_inviter_id is null or p_email is null then raise exception 'invalid_invite'; end if;
  if not exists(select 1 from public.profiles where id=p_inviter_id and company_id=p_company_id and role='gc') then
    raise exception 'forbidden';
  end if;
  if lower(p_email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;
  -- Public-mail invitations are bound by exact address in invite_log. Corporate
  -- addresses must match the firm's owner domain before a new invite is sent.
  if not public.is_public_email_domain(public.company_email_domain(p_company_id))
    and not public.is_public_email_domain(split_part(lower(p_email),'@',2)) then
    perform public.assert_company_email(p_company_id,p_email);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text,0));
  select count(*) into v_count from public.invite_log where company_id=p_company_id and created_at>=now()-interval '1 hour';
  if v_count>=20 then raise exception 'invite_rate_limit'; end if;
  insert into public.invite_log(company_id,invited_by,email) values(p_company_id,p_inviter_id,lower(btrim(p_email)));
end $$;
revoke all on function public.reserve_company_invite(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_company_invite(uuid,uuid,text) to service_role;

-- Onboarding is the server-side gate for email sign-in: an authenticated email
-- must match the owner domain before it can join or create a company profile.
create or replace function public.create_company_and_profile(
  p_company_name text,p_full_name text default null,p_locale text default 'ru'
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_email text:=lower(coalesce(auth.jwt()->>'email',''));
  v_company_id uuid; v_domain text; v_company_name text:=nullif(btrim(p_company_name),'');
  v_full_name text:=nullif(btrim(p_full_name),''); v_locale text:=coalesce(nullif(btrim(p_locale),''),'ru');
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;
  if v_locale not in ('et','ru','en') then raise exception 'invalid_locale'; end if;
  if length(coalesce(v_company_name,''))>120 then raise exception 'invalid_company_name'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text,0));
  select company_id into v_company_id from public.profiles where id=v_user_id;
  if v_company_id is not null then
    perform public.assert_company_email(v_company_id,v_email);
    return v_company_id;
  end if;
  -- Existing invitation record binds the email to a company. Self-service
  -- creation is allowed only when this is the first owner of a new company.
  select il.company_id into v_company_id from public.invite_log il where lower(il.email)=v_email order by il.created_at desc limit 1;
  if v_company_id is not null then
    perform public.assert_company_email(v_company_id,v_email);
    insert into public.profiles(id,company_id,full_name,role,locale)
      values(v_user_id,v_company_id,v_full_name,'worker',v_locale)
      on conflict(id) do update set company_id=excluded.company_id,full_name=coalesce(excluded.full_name,profiles.full_name),locale=excluded.locale;
    return v_company_id;
  end if;
  if v_company_name is null then v_company_name:=split_part(v_email,'@',2); end if;
  insert into public.companies(name) values(v_company_name) returning id into v_company_id;
  insert into public.profiles(id,company_id,full_name,role,locale)
    values(v_user_id,v_company_id,coalesce(v_full_name,nullif(btrim(auth.jwt()->'user_metadata'->>'full_name'),'')),'gc',v_locale)
    on conflict(id) do update set company_id=excluded.company_id,full_name=coalesce(excluded.full_name,profiles.full_name),role='gc',locale=excluded.locale;
  return v_company_id;
end $$;
revoke all on function public.create_company_and_profile(text,text,text) from public,anon;
grant execute on function public.create_company_and_profile(text,text,text) to authenticated;

-- Reports above the configured threshold are queued; ordinary/small changes
-- update the stage immediately and are marked accepted.
create or replace function public.submit_stage_report(
  p_project_stage_id uuid,p_new_percent int,p_comment text,p_photo_paths text[]
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid(); v_role public.user_role; v_project uuid; v_company uuid;
  v_old integer; v_threshold integer; v_report_id uuid;
  v_paths text[]:=coalesce(p_photo_paths,array[]::text[]); v_comment text:=nullif(btrim(p_comment),'');
  v_status text;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select role into v_role from public.profiles where id=v_uid;
  if v_role is null or v_role not in ('gc','foreman','worker') then raise exception 'forbidden'; end if;
  if p_new_percent is null or p_new_percent not between 0 and 100 then raise exception 'invalid_percent'; end if;
  select ps.project_id,ps.progress_percent,p.company_id,p.review_threshold into v_project,v_old,v_company,v_threshold
    from public.project_stages ps join public.projects p on p.id=ps.project_id where ps.id=p_project_stage_id for update of ps;
  if not found or not public.has_project_access(v_project) then raise exception 'forbidden'; end if;
  if exists(select 1 from unnest(v_paths) path where path is null or path !~ ('^'||v_project::text||'/.+')) then raise exception 'invalid_photo_path'; end if;
  if v_role='worker' and p_new_percent>v_old and cardinality(v_paths)<1 then raise exception 'photo_required_for_progress'; end if;
  if p_new_percent<v_old and v_comment is null then raise exception 'comment_required_for_decrease'; end if;
  if p_new_percent=v_old and cardinality(v_paths)=0 and v_comment is null then raise exception 'nothing_to_report'; end if;
  select sr.id into v_report_id from public.stage_reports sr
    where sr.project_stage_id=p_project_stage_id and sr.reporter_id=v_uid and sr.new_percent=p_new_percent
      and sr.comment is not distinct from v_comment and sr.created_at>=now()-interval '10 minutes'
      and (select coalesce(array_agg(ph.storage_path order by ph.storage_path),array[]::text[]) from public.photos ph where ph.report_id=sr.id)
        =(select coalesce(array_agg(path order by path),array[]::text[]) from unnest(v_paths) path)
    order by sr.created_at desc limit 1;
  if v_report_id is not null then return v_report_id; end if;
  v_status:=case when p_new_percent-v_old>v_threshold then 'pending' else 'accepted' end;
  if v_status='accepted' then update public.project_stages set progress_percent=p_new_percent,updated_at=now(),updated_by=v_uid where id=p_project_stage_id; end if;
  insert into public.stage_reports(project_stage_id,project_id,reporter_id,old_percent,new_percent,comment,status,confirmed_percent)
    values(p_project_stage_id,v_project,v_uid,v_old,p_new_percent,v_comment,v_status,case when v_status='accepted' then p_new_percent else v_old end)
    returning id into v_report_id;
  insert into public.stage_history(project_stage_id,old_percent,new_percent,changed_by,report_id)
    values(p_project_stage_id,v_old,p_new_percent,v_uid,v_report_id);
  insert into public.photos(project_id,project_stage_id,storage_path,caption,uploaded_by,report_id)
    select v_project,p_project_stage_id,path,v_comment,v_uid,v_report_id from unnest(v_paths) path;
  return v_report_id;
end $$;
revoke all on function public.submit_stage_report(uuid,int,text,text[]) from public,anon;
grant execute on function public.submit_stage_report(uuid,int,text,text[]) to authenticated;

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
  update public.project_stages ps set progress_percent=sr.new_percent,updated_at=now(),updated_by=v_uid
    from public.stage_reports sr where sr.id=any(p_report_ids) and ps.id=sr.project_stage_id;
  return v_count;
end $$;
revoke all on function public.review_stage_reports(uuid[]) from public,anon;
grant execute on function public.review_stage_reports(uuid[]) to authenticated;

-- Larger jumps require an individual decision; they can never enter the batch RPC.
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

notify pgrst,'reload schema';
