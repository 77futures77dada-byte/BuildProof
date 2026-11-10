-- Edit these two values before running in the target Supabase project's SQL editor.
do $$
declare
  v_client_email text := 'demo-client@change-me.invalid';
  v_worker_email text := 'demo-worker@change-me.invalid';
  v_client uuid; v_worker uuid; v_company uuid := 'd0000000-0000-4000-8000-000000000001';
  v_project uuid := 'd0000000-0000-4000-8000-000000000002';
  v_stage uuid; v_report uuid; v_old integer; v_new integer; v_day integer; v_idx integer;
  v_photo text;
begin
  select id into v_client from auth.users where lower(email)=lower(v_client_email) limit 1;
  select id into v_worker from auth.users where lower(email)=lower(v_worker_email) limit 1;
  if v_client is null or v_worker is null then
    raise exception 'Create the configured demo client and demo worker Auth users before running this seed';
  end if;

  insert into public.companies(id,name) values(v_company,'Demo')
    on conflict(id) do update set name=excluded.name;
  insert into public.profiles(id,company_id,full_name,role,locale) values
    (v_client,v_company,'Demo Client','client','en'),(v_worker,v_company,'Demo Site Worker','worker','en')
  on conflict(id) do update set company_id=excluded.company_id,full_name=excluded.full_name,role=excluded.role,locale=excluded.locale;
  insert into public.projects(id,company_id,name,address,deadline,budget,status) values
    (v_project,v_company,'ЖК «Северный парк», корпус 3','Tallinn, Estonia',current_date+120,4800000,'active')
  on conflict(id) do update set company_id=excluded.company_id,name=excluded.name,address=excluded.address,
    deadline=excluded.deadline,budget=excluded.budget,status=excluded.status;
  insert into public.project_stages(project_id,stage_template_id,progress_percent)
    select v_project,id,0 from public.stage_templates on conflict(project_id,stage_template_id) do nothing;
  update public.project_stages set progress_percent=0,updated_at=now(),updated_by=null where project_id=v_project;

  delete from public.photos where project_id=v_project;
  delete from public.stage_reports where project_id=v_project;
  delete from public.stage_history where project_stage_id in (select id from public.project_stages where project_id=v_project);
  delete from public.issues where project_id=v_project;
  delete from public.tasks where project_id=v_project;
  delete from public.project_access where project_id=v_project;
  insert into public.project_access(project_id,user_id) values(v_project,v_client),(v_project,v_worker)
    on conflict do nothing;

  -- Fifteen reports across seven stages over the last 30 days.
  for v_idx in 1..15 loop
    select ps.id,ps.progress_percent into v_stage,v_old from public.project_stages ps
      join public.stage_templates st on st.id=ps.stage_template_id where ps.project_id=v_project order by st.sort_order
      offset ((v_idx-1)%7) limit 1;
    v_new := least(100,greatest(v_old, 10 + (((v_idx-1)/7)*20) + ((v_idx-1)%7)*5));
    v_day := (15-v_idx)*2;
    v_photo := case when v_idx<=6 then 'demo/sample-' || lpad(v_idx::text,2,'0') || '.jpg' else null end;
    insert into public.stage_reports(project_stage_id,project_id,reporter_id,old_percent,new_percent,comment,created_at)
      values(v_stage,v_project,v_worker,v_old,v_new,
        (array['Site checked; rebar inspection passed.','Concrete pour completed on schedule.',
          'Materials delivered and stored safely.','Crew finished the planned section.',
          'Quality check completed; ready for next trade.'])[1+((v_idx-1)%5)],now()-make_interval(days=>v_day)) returning id into v_report;
    update public.project_stages set progress_percent=v_new,updated_at=now()-make_interval(days=>v_day),updated_by=v_worker where id=v_stage;
    insert into public.stage_history(project_stage_id,old_percent,new_percent,changed_by,changed_at,report_id)
      values(v_stage,v_old,v_new,v_worker,now()-make_interval(days=>v_day),v_report);
    if v_photo is not null then
      insert into public.photos(project_id,project_stage_id,storage_path,caption,uploaded_by,uploaded_at,report_id)
        values(v_project,v_stage,v_photo,'Generated demo placeholder',v_worker,now()-make_interval(days=>v_day),v_report);
    end if;
  end loop;

  insert into public.issues(project_id,title,description,priority,responsible_party,status,due_date,created_by,created_at) values
    (v_project,'Protect exposed reinforcement','Rebar at the north stair core needs temporary covers.','high','Concrete crew','open',current_date+2,v_worker,now()-interval '3 days'),
    (v_project,'Confirm window delivery','Confirm the revised delivery date with the supplier.','medium','Procurement','open',current_date+5,v_worker,now()-interval '2 days'),
    (v_project,'Clear access to riser','Move stored materials away from the service riser.','low','Electrical crew','open',current_date+1,v_worker,now()-interval '1 day');

  for v_idx in 1..12 loop
    insert into public.tasks(project_id,title,assigned_to,deadline,status,created_by,created_at,completed_at)
    values(v_project,
      (array['Check slab levels','Install edge protection','Inspect formwork','Deliver conduit','Mark service routes','Verify waterproofing','Photograph inspection points','Clear loading area','Check window openings','Confirm concrete samples','Update daily log','Prepare next trade handoff'])[v_idx],
      v_worker,current_date+v_idx,
      case when v_idx<=4 then 'done'::public.task_status when v_idx<=8 then 'in_progress'::public.task_status else 'todo'::public.task_status end,
      v_worker,now()-make_interval(days=>least(v_idx,14)),
      case when v_idx<=4 then now()-make_interval(days=>5-v_idx) else null end);
  end loop;
end $$;
