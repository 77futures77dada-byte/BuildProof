create table public.client_links (
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
create index client_links_project_active_idx on public.client_links(project_id,expires_at) where revoked_at is null;
alter table public.client_links enable row level security;
revoke all on public.client_links from public,anon,authenticated;
grant select on public.client_links to service_role;

create table public.project_stage_client_visibility (
  project_id uuid not null references public.projects(id) on delete cascade,
  project_stage_id uuid not null references public.project_stages(id) on delete cascade,
  visible boolean not null default false,
  photos_visible boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key(project_id,project_stage_id)
);
alter table public.project_stage_client_visibility enable row level security;
drop policy if exists project_stage_client_visibility_owner_select on public.project_stage_client_visibility;
create policy project_stage_client_visibility_owner_select on public.project_stage_client_visibility
  for select to authenticated using (project_id in (select id from public.projects where company_id=public.current_user_company_id() and public.current_user_role()='gc'));
revoke insert,update,delete on public.project_stage_client_visibility from public,anon,authenticated;
grant select on public.project_stage_client_visibility to authenticated;

create or replace function public.create_client_link(
  p_project_id uuid,p_created_by uuid,p_display_name text,p_token_hash text,p_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid; v_owner_email text; v_id uuid;
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
  if (select count(*) from public.client_links where project_id=p_project_id and revoked_at is null and expires_at>now())>=50 then raise exception 'client_link_limit'; end if;
  insert into public.client_links(project_id,created_by,display_name,token_hash,expires_at)
    values(p_project_id,p_created_by,btrim(p_display_name),p_token_hash,p_expires_at) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_client_link(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.create_client_link(uuid,uuid,text,text,timestamptz) to service_role;

create or replace function public.revoke_client_link(p_link_id uuid,p_company_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  update public.client_links cl set revoked_at=coalesce(cl.revoked_at,now())
  from public.projects p where cl.id=p_link_id and p.id=cl.project_id and p.company_id=p_company_id;
  return found;
end $$;
revoke all on function public.revoke_client_link(uuid,uuid) from public,anon,authenticated;
grant execute on function public.revoke_client_link(uuid,uuid) to service_role;

create or replace function public.set_client_stage_visibility(
  p_project_id uuid,p_stage_id uuid,p_owner_id uuid,p_visible boolean,p_photos_visible boolean
) returns void language plpgsql security definer set search_path=public as $$
declare v_company uuid; v_owner_email text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  select company_id into v_company from public.projects where id=p_project_id;
  select u.email into v_owner_email from public.profiles pr join auth.users u on u.id=pr.id
    where pr.id=p_owner_id and pr.role='gc' and pr.company_id=v_company;
  if v_company is null or v_owner_email is null then raise exception 'forbidden'; end if;
  perform public.assert_company_email(v_company,v_owner_email);
  if not exists(select 1 from public.project_stages where id=p_stage_id and project_id=p_project_id) then raise exception 'stage_not_found'; end if;
  insert into public.project_stage_client_visibility(project_id,project_stage_id,visible,photos_visible,updated_by,updated_at)
    values(p_project_id,p_stage_id,coalesce(p_visible,false),coalesce(p_visible,false) and coalesce(p_photos_visible,false),p_owner_id,now())
  on conflict(project_id,project_stage_id) do update set visible=excluded.visible,
    photos_visible=excluded.photos_visible,updated_by=excluded.updated_by,updated_at=now();
end $$;
revoke all on function public.set_client_stage_visibility(uuid,uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.set_client_stage_visibility(uuid,uuid,uuid,boolean,boolean) to service_role;

-- Same RPC and filtering for public links and the owner's preview mode.
create or replace function public.client_project_view(p_token text default null,p_project_id uuid default null,p_owner_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_project_id uuid; v_company_id uuid; v_owner_email text; v_link public.client_links%rowtype; v_result jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if p_owner_id is not null then
    select p.id,p.company_id,u.email into v_project_id,v_company_id,v_owner_email from public.projects p
      join public.profiles owner_profile on owner_profile.company_id=p.company_id and owner_profile.id=p_owner_id and owner_profile.role='gc'
      join auth.users u on u.id=owner_profile.id where p.id=p_project_id;
    if v_project_id is null or v_owner_email is null then raise exception 'forbidden'; end if;
    perform public.assert_company_email(v_company_id,v_owner_email);
  else
    update public.client_links cl set last_used_at=now()
      where cl.token_hash=encode(digest(p_token,'sha256'),'hex') and cl.revoked_at is null and cl.expires_at>now()
      returning cl.* into v_link;
    if not found then raise exception 'invalid_client_link'; end if;
    v_project_id:=v_link.project_id;
  end if;
  select jsonb_build_object(
    'project_id',p.id,'project_name',p.name,
    'disclaimer','client.disclaimer.percentNotPayment',
    'stages',coalesce((select jsonb_agg(jsonb_build_object(
      'stage_id',ps.id,'name',st.name,'confirmed_percent',sr.confirmed_percent,
      'updated_at',sr.reviewed_at,
      'photos',case when visibility.photos_visible then coalesce((select jsonb_agg(jsonb_build_object('path',ph.storage_path))
        from public.photos ph where ph.report_id=sr.id), '[]'::jsonb) else '[]'::jsonb end
    ) order by st.sort_order)
    from public.project_stages ps join public.stage_templates st on st.id=ps.stage_template_id
    join public.project_stage_client_visibility visibility on visibility.project_id=p.id and visibility.project_stage_id=ps.id and visibility.visible
    join lateral (select report.confirmed_percent,report.reviewed_at,report.id from public.stage_reports report
      where report.project_stage_id=ps.id and report.project_id=p.id and report.status='confirmed'
      order by report.reviewed_at desc nulls last,report.created_at desc limit 1) sr on true),'[]'::jsonb)
  ) into v_result from public.projects p where p.id=v_project_id;
  return v_result;
end $$;
revoke all on function public.client_project_view(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.client_project_view(text,uuid,uuid) to service_role;

notify pgrst,'reload schema';
