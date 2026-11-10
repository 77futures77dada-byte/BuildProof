-- Demo seed for the company attached to artjomsamokater@gmail.com.
-- Run the whole file in Supabase SQL Editor after migrations 000–005.
-- This file only removes the named legacy demo objects inside that one company.
begin;

do $$
declare
  v_owner_id uuid;
  v_company_id uuid;
  v_tartu uuid := 'e1000000-0000-4000-8000-000000000001';
  v_elva uuid := 'e1000000-0000-4000-8000-000000000002';
  v_voru uuid := 'e1000000-0000-4000-8000-000000000003';
  v_stage uuid;
  v_worker uuid;
  v_report uuid;
  v_old integer;
  v_idx integer;
  v_project uuid;
  v_names text[] := array[
    'Тарту, Вокзали 12 · ремонт квартиры',
    'Элва, Кооли 5 · новый дом',
    'Выру, Юри 8 · крыша'
  ];
  v_addresses text[] := array[
    'Vaksali 12, Tartu, Estonia',
    'Kooli 5, Elva, Estonia',
    'Jüri 8, Võru, Estonia'
  ];
  v_project_ids uuid[] := array[v_tartu, v_elva, v_voru];
begin
  select u.id, p.company_id into v_owner_id, v_company_id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = 'artjomsamokater@gmail.com'
    and p.company_id is not null
  limit 1;
  if v_owner_id is null or v_company_id is null then
    raise exception 'No configured company profile found for artjomsamokater@gmail.com';
  end if;

  -- Delete only the named legacy demo records belonging to the requested account.
  delete from public.projects p
  where p.company_id = v_company_id
    and (
      lower(btrim(p.name)) = 'obje'
      or lower(p.name) like '%suzuki%'
      or (p.name ilike '%Северный парк%' and coalesce(p.address, '') ilike '%Казан%')
    );

  -- These IDs make reruns update the same three seed projects.
  for v_idx in 1..3 loop
    insert into public.projects(id, company_id, name, address, deadline, status)
    values (v_project_ids[v_idx], v_company_id, v_names[v_idx], v_addresses[v_idx],
      current_date + case v_idx when 1 then 35 when 2 then 90 else 20 end,
      'active'::public.project_status)
    on conflict (id) do update set
      name = excluded.name,
      address = excluded.address,
      deadline = excluded.deadline,
      status = excluded.status
    where public.projects.company_id = excluded.company_id;

    if not exists (
      select 1 from public.projects p
      where p.id = v_project_ids[v_idx] and p.company_id = v_company_id
    ) then
      raise exception 'Seed project ID is already used by another company: %', v_project_ids[v_idx];
    end if;

    insert into public.project_stages(project_id, stage_template_id)
    select v_project_ids[v_idx], st.id from public.stage_templates st
    on conflict (project_id, stage_template_id) do nothing;
  end loop;

  -- Replace only generated demo activity on these three fixed seed projects.
  delete from public.photos ph where ph.project_id = any(v_project_ids);
  delete from public.stage_reports sr where sr.project_id = any(v_project_ids);
  delete from public.stage_history sh
  where sh.project_stage_id in (
    select ps.id from public.project_stages ps where ps.project_id = any(v_project_ids)
  );
  delete from public.issues i where i.project_id = any(v_project_ids);
  delete from public.tasks t where t.project_id = any(v_project_ids);
  delete from public.project_access a where a.project_id = any(v_project_ids);

  insert into public.project_access(project_id, user_id)
  select seeded.project_id, v_owner_id from unnest(v_project_ids) as seeded(project_id)
  on conflict do nothing;

  -- Prototype-equivalent progress: Repair, House, and Roof project shapes.
  update public.project_stages ps
  set progress_percent = case ps.project_id
    when v_tartu then (array[100,70,90,80,20,0,10])[st.sort_order]
    when v_elva then (array[100,90,60,40,0,25,0])[st.sort_order]
    when v_voru then (array[100,100,30,0,0,0,0])[st.sort_order]
  end,
  updated_at = now(),
  updated_by = v_owner_id
  from public.stage_templates st
  where ps.stage_template_id = st.id and ps.project_id = any(v_project_ids);

  -- The current report schema has no pending/confirmed state yet. Seed only
  -- completed history here; the waiting-review demo state needs the reports
  -- workflow migration before it can be represented without pretending it was accepted.
  select ps.id, ps.progress_percent into v_stage, v_old
  from public.project_stages ps join public.stage_templates st on st.id = ps.stage_template_id
  where ps.project_id = v_tartu and st.sort_order = 7;
  insert into public.stage_reports(project_stage_id, project_id, reporter_id, old_percent, new_percent, comment, created_at)
  values (v_stage, v_tartu, v_owner_id, v_old - 10, v_old, 'Яан: ремонтный этап отмечен за сегодня.', now())
  returning id into v_report;
  insert into public.stage_history(project_stage_id, old_percent, new_percent, changed_by, changed_at, report_id)
  values (v_stage, v_old - 10, v_old, v_owner_id, now(), v_report);

  select ps.id, ps.progress_percent into v_stage, v_old
  from public.project_stages ps join public.stage_templates st on st.id = ps.stage_template_id
  where ps.project_id = v_elva and st.sort_order = 2;
  insert into public.stage_reports(project_stage_id, project_id, reporter_id, old_percent, new_percent, comment, created_at)
  values (v_stage, v_elva, v_owner_id, v_old - 10, v_old, 'Март: последний отчёт; объект два дня без нового отчёта.', now() - interval '2 days')
  returning id into v_report;
  insert into public.stage_history(project_stage_id, old_percent, new_percent, changed_by, changed_at, report_id)
  values (v_stage, v_old - 10, v_old, v_owner_id, now() - interval '2 days', v_report);

  select ps.id, ps.progress_percent into v_stage, v_old
  from public.project_stages ps join public.stage_templates st on st.id = ps.stage_template_id
  where ps.project_id = v_voru and st.sort_order = 3;
  insert into public.stage_reports(project_stage_id, project_id, reporter_id, old_percent, new_percent, comment, created_at)
  values (v_stage, v_voru, v_owner_id, v_old - 10, v_old, 'Тоомас: последний отчёт; сообщил о проблеме с поставкой труб.', now() - interval '5 days')
  returning id into v_report;
  insert into public.stage_history(project_stage_id, old_percent, new_percent, changed_by, changed_at, report_id)
  values (v_stage, v_old - 10, v_old, v_owner_id, now() - interval '5 days', v_report);
  insert into public.issues(project_id, title, description, priority, responsible_party, status, due_date, created_by, created_at)
  values (v_voru, 'Срочно: не доставили ПВХ-трубы', 'Тоомас сообщил, что поставка труб не приехала. Нужна срочная проверка.',
    'high', 'Тоомас', 'open', current_date, v_owner_id, now() - interval '5 days');

  -- Crew names are kept on demo tasks until worker auth accounts are provisioned.
  for v_idx in 1..3 loop
    v_project := v_project_ids[v_idx];
    insert into public.tasks(project_id, title, assigned_to, deadline, status, created_by)
    values
      (v_project, (array['Яан · проверить готовность этапов','Март · сверить поставку материалов','Тоомас · проверить кровлю'])[v_idx],
        null, current_date + v_idx, 'todo', v_owner_id);
  end loop;
end;
$$;

commit;

-- Verification output: expected rows are the three Estonia projects, with
-- readiness rounded from the seven stage percentages and one open issue on Võru.
select p.name as object,
       round(avg(ps.progress_percent))::integer as readiness_percent,
       max(sr.created_at) as last_report,
       count(distinct i.id) filter (where i.status <> 'resolved') as open_issues
from public.projects p
join public.project_stages ps on ps.project_id = p.id
left join public.stage_reports sr on sr.project_id = p.id
left join public.issues i on i.project_id = p.id
where p.id in (
  'e1000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000002',
  'e1000000-0000-4000-8000-000000000003'
)
group by p.id, p.name
order by p.name;
