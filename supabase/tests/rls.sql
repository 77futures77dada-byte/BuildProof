begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(33);
select is(
  (select bool_and(c.relrowsecurity)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('r','p')),
  true,
  'baseline and hardening migrations keep RLS enabled on public tables'
);
select is(
  (select c.relrowsecurity from pg_class c where c.oid='public.invite_log'::regclass),
  true,
  'invite migration enables RLS on invite_log'
);
select is(
  has_function_privilege('service_role','public.reserve_company_invite(uuid,uuid,text)','EXECUTE')
  and not has_function_privilege('anon','public.reserve_company_invite(uuid,uuid,text)','EXECUTE')
  and not has_function_privilege('authenticated','public.reserve_company_invite(uuid,uuid,text)','EXECUTE'),
  true,
  'invite reservation is executable only by the server service role'
);
select is(
  (select p.prosecdef and 'search_path=public'=any(p.proconfig)
   from pg_proc p where p.oid='public.create_project_with_stages(uuid,text,text,date,numeric)'::regprocedure),
  true,
  'project creation RPC is SECURITY DEFINER with a fixed search path'
);
select is(
  (select p.prosecdef
          and 'search_path=public'=any(p.proconfig)
          and not has_function_privilege('anon',p.oid,'EXECUTE')
          and has_function_privilege('authenticated',p.oid,'EXECUTE')
   from pg_proc p where p.oid='public.create_company_and_profile(text,text,text)'::regprocedure),
  true,
  'onboarding RPC is SECURITY DEFINER with a fixed search path'
);
select is(
  has_function_privilege('anon','public.create_project_with_stages(uuid,text,text,date,numeric)','EXECUTE'),
  false,
  'anonymous users cannot create projects through the RPC'
);
select is(
  has_function_privilege('authenticated','public.create_project_with_stages(uuid,text,text,date,numeric)','EXECUTE'),
  true,
  'authenticated users can call the project creation RPC'
);
select is(
  has_column_privilege('authenticated','public.profiles','role','UPDATE'),
  false,
  'authenticated cannot update profiles.role'
);

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','gc-a@test.invalid','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000002','authenticated','authenticated','worker-a@test.invalid','',now(),'{}','{}',now(),now()),
 ('20000000-0000-4000-8000-000000000001','authenticated','authenticated','gc-b@test.invalid','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000003','authenticated','authenticated','client-a@test.invalid','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000004','authenticated','authenticated','foreman-a@test.invalid','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000005','authenticated','authenticated','onboarding-a@test.invalid','',now(),
  '{"provider":"email","providers":["email"]}',
  '{"company_name":"Signup Company","full_name":"Signup Owner"}',now(),now()),
 ('10000000-0000-4000-8000-000000000006','authenticated','authenticated','locale-a@test.invalid','',now(),
  '{"provider":"email","providers":["email"]}',
  '{"company_name":"Locale Company","full_name":"Locale Owner"}',now(),now());
select is((select count(*) from public.profiles where id='10000000-0000-4000-8000-000000000005'),0::bigint,
  'signup leaves profile creation to the authenticated onboarding RPC');
insert into public.profiles(id,company_id,full_name,role) values
 ('10000000-0000-4000-8000-000000000006',null,'Locale Owner','gc');
insert into public.companies(id,name) values
 ('30000000-0000-4000-8000-000000000001','Tenant A'),('30000000-0000-4000-8000-000000000002','Tenant B');
insert into public.profiles(id,company_id,full_name,role) values
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','GC A','gc'),
 ('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Worker A','worker'),
 ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','GC B','gc'),
 ('10000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Client A','client'),
 ('10000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','Foreman A','foreman')
on conflict (id) do update set company_id=excluded.company_id,full_name=excluded.full_name,role=excluded.role;
insert into public.projects(id,company_id,name) values
 ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Project A'),
 ('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Project B');
insert into public.project_access(project_id,user_id) values
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
insert into public.project_access(project_id,user_id) values
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003'),
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004');
insert into public.project_stages(id,project_id,stage_template_id)
 select '50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',id
 from public.stage_templates where sort_order=1;
insert into public.tasks(id,project_id,title,assigned_to,created_by) values
 ('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Worker task',
  '10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select throws_ok($$update public.profiles set role='gc' where id=auth.uid()$$,'42501',null,'worker cannot elevate own role');
select is((select count(*) from public.projects where id='40000000-0000-4000-8000-000000000002'),0::bigint,'tenant A cannot read tenant B project');
select throws_ok($$insert into public.project_access(project_id,user_id) values ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002')$$,'42501',null,'tenant A cannot grant access to tenant B project');
select throws_ok($$insert into public.stage_history(project_stage_id,old_percent,new_percent,changed_by) values ('50000000-0000-4000-8000-000000000001',0,5,auth.uid())$$,'42501',null,'worker cannot write history directly');
select throws_ok($$select public.submit_stage_report('50000000-0000-4000-8000-000000000001',10,null,array[]::text[])$$,'P0001','photo_required_for_progress','worker increase requires a photo');
select throws_ok($$select public.submit_stage_report('50000000-0000-4000-8000-000000000001',0,null,array[]::text[])$$,'P0001','comment_required_for_decrease','decrease requires a comment');
select is(public.submit_stage_report('50000000-0000-4000-8000-000000000001',10,'weekly report',array['40000000-0000-4000-8000-000000000001/demo/progress.jpg']),
  public.submit_stage_report('50000000-0000-4000-8000-000000000001',10,'weekly report',array['40000000-0000-4000-8000-000000000001/demo/progress.jpg']),
  'retry returns existing report');
select throws_ok($$update public.tasks set title='injected' where id='60000000-0000-4000-8000-000000000001'$$,'P0001','task_fields_restricted','worker cannot alter protected task columns');
select lives_ok($$update public.tasks set status='done' where id='60000000-0000-4000-8000-000000000001'$$,'worker can update assigned task status');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select is((select count(*) from public.projects where id='40000000-0000-4000-8000-000000000001'),1::bigint,'client can read granted project');
select is((select count(*) from public.projects where id='40000000-0000-4000-8000-000000000002'),0::bigint,'client cannot read an ungranted project');
select throws_ok($$insert into public.issues(project_id,title,created_by) values ('40000000-0000-4000-8000-000000000001','forbidden',auth.uid())$$,'42501',null,'client cannot create issues');
select throws_ok($$insert into public.photos(project_id,storage_path,uploaded_by) values ('40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001/no.jpg',auth.uid())$$,'42501',null,'client cannot create photos');
select throws_ok($$insert into public.tasks(project_id,title,created_by) values ('40000000-0000-4000-8000-000000000001','forbidden',auth.uid())$$,'42501',null,'client cannot create tasks');
select throws_ok($$select public.update_stage_progress('50000000-0000-4000-8000-000000000001',5)$$,'P0001','forbidden','client cannot update stage progress');
select throws_ok($$select public.create_project_with_stages('30000000-0000-4000-8000-000000000001','Client project')$$,
  'P0001','forbidden','client cannot create projects through the RPC');
select throws_ok($$insert into public.stage_reports(project_stage_id,project_id,reporter_id,old_percent,new_percent) values ('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',auth.uid(),0,5)$$,'42501',null,'client cannot write reports directly');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select lives_ok($$select public.update_stage_progress('50000000-0000-4000-8000-000000000001',5)$$,'foreman can update stage through RPC');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
select is(
  (with created as materialized (
     select public.create_company_and_profile('Recovered Company','Recovered Owner') as id
   )
   select c.name='Recovered Company' and p.locale='ru'
   from public.companies c join created on c.id=created.id
   join public.profiles p on p.company_id=c.id and p.id=auth.uid()),
  true,
  'two-argument onboarding RPC creates the profile with its default Russian locale'
);
select is(
  (with retry as materialized (
     select public.create_company_and_profile('Ignored Retry Name','Ignored Retry Name') as company_id
   )
   select retry.company_id = p.company_id
   from retry join public.profiles p on p.id=auth.uid()),
  true,
  'onboarding RPC retry returns the same company without creating a duplicate'
);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000006","email":"locale-a@test.invalid"}',true);
select is(
  (with created as materialized (
     select public.create_company_and_profile(null,'Locale Owner','et') as id
   )
   select c.name='test.invalid' and p.locale='et' and p.role::text='gc'
   from public.companies c join created on c.id=created.id
   join public.profiles p on p.company_id=c.id and p.id=auth.uid()),
  true,
  'onboarding RPC accepts p_locale and repairs a profile with no company'
);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.projects where id='40000000-0000-4000-8000-000000000002'),0::bigint,'gc cannot read another tenant project');
select throws_ok($$insert into public.project_access(project_id,user_id) values ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001')$$,'42501',null,'gc cannot grant another tenant access');
select is(
  (with created as materialized (
     select public.create_project_with_stages('30000000-0000-4000-8000-000000000001','RPC project') as id
   )
   select count(*) from public.project_stages ps join created on ps.project_id=created.id),
  7::bigint,
  'company owner creates a project with all stages through the RPC'
);

reset role;
select * from finish();
rollback;
