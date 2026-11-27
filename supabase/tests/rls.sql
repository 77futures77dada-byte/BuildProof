begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(50);
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
  has_function_privilege('authenticated','public.review_stage_reports(uuid[])','EXECUTE')
  and not has_function_privilege('anon','public.review_stage_reports(uuid[])','EXECUTE'),
  true,
  'only authenticated users can invoke report review RPC'
);
select is(
  has_function_privilege('service_role','public.assert_company_email(uuid,text)','EXECUTE')
  and not has_function_privilege('anon','public.assert_company_email(uuid,text)','EXECUTE')
  and not has_function_privilege('authenticated','public.assert_company_email(uuid,text)','EXECUTE'),
  true,
  'company email gate is callable only from the trusted server'
);
select is(
  (select count(*) from information_schema.columns where table_schema='public' and table_name='stage_reports'
   and column_name in ('status','confirmed_percent','reviewed_by','reviewed_at','review_note')),
  5::bigint,
  'K15 report review fields are present'
);
select is(
  (select column_default like '%25%' from information_schema.columns where table_schema='public'
   and table_name='projects' and column_name='review_threshold'),
  true,
  'review threshold defaults to 25 percentage points per project'
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
  '{"company_name":"Locale Company","full_name":"Locale Owner"}',now(),now()),
 ('10000000-0000-4000-8000-000000000007','authenticated','authenticated','outsider@other.invalid','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000008','authenticated','authenticated','owner@gmail.com','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000009','authenticated','authenticated','crew@gmail.com','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000010','authenticated','authenticated','stranger@gmail.com','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000011','authenticated','authenticated','owner@firma.ee','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000012','authenticated','authenticated','crew@firma.ee','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000013','authenticated','authenticated','oldcrew@gmail.com','',now(),'{}','{}',now(),now());
select is((select count(*) from public.profiles where id='10000000-0000-4000-8000-000000000005'),0::bigint,
  'signup leaves profile creation to the authenticated onboarding RPC');
insert into public.profiles(id,company_id,full_name,role) values
 ('10000000-0000-4000-8000-000000000006',null,'Locale Owner','gc');
insert into public.companies(id,name) values
 ('30000000-0000-4000-8000-000000000001','Tenant A'),('30000000-0000-4000-8000-000000000002','Tenant B'),
 ('30000000-0000-4000-8000-000000000003','Public mail firm'),('30000000-0000-4000-8000-000000000004','Corporate firm');
insert into public.profiles(id,company_id,full_name,role) values
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','GC A','gc'),
 ('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Worker A','worker'),
 ('10000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000001','Outsider','worker'),
 ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','GC B','gc'),
 ('10000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Client A','client'),
 ('10000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','Foreman A','foreman'),
 ('10000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000003','Gmail owner','gc'),
 ('10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000003','Invited Gmail worker','worker'),
 ('10000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000003','Uninvited Gmail user','worker'),
 ('10000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000004','Corporate owner','gc'),
 ('10000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000004','Corporate worker','worker'),
 ('10000000-0000-4000-8000-000000000013','30000000-0000-4000-8000-000000000003','Existing Gmail worker','worker')
on conflict (id) do update set company_id=excluded.company_id,full_name=excluded.full_name,role=excluded.role;
insert into public.invite_log(company_id,invited_by,email) values
 ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000008','crew@gmail.com');
-- Exercise the migration backfill twice for a pre-existing public-mail member.
insert into public.invite_log(company_id,invited_by,email,created_at)
select member.company_id,owner.id,lower(account.email),now()-interval '1 day'
from public.profiles member join auth.users account on account.id=member.id
join lateral (select gc.id from public.profiles gc where gc.company_id=member.company_id and gc.role='gc' order by gc.id limit 1) owner on true
where member.id='10000000-0000-4000-8000-000000000013'
  and not exists(select 1 from public.invite_log sent where sent.company_id=member.company_id and lower(sent.email)=lower(account.email));
insert into public.invite_log(company_id,invited_by,email,created_at)
select member.company_id,owner.id,lower(account.email),now()-interval '1 day'
from public.profiles member join auth.users account on account.id=member.id
join lateral (select gc.id from public.profiles gc where gc.company_id=member.company_id and gc.role='gc' order by gc.id limit 1) owner on true
where member.id='10000000-0000-4000-8000-000000000013'
  and not exists(select 1 from public.invite_log sent where sent.company_id=member.company_id and lower(sent.email)=lower(account.email));
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
insert into public.project_stages(id,project_id,stage_template_id)
 select '50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002',id
 from public.stage_templates where sort_order=1;
insert into public.stage_reports(id,project_stage_id,project_id,reporter_id,old_percent,new_percent,status)
 values('70000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002',
 '40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',0,30,'pending'),
 ('70000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',0,20,'accepted'),
 ('70000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004',0,15,'accepted'),
 ('70000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',20,55,'pending'),
 ('70000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004',0,5,'pending'),
 ('70000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',20,30,'accepted'),
 ('70000000-0000-4000-8000-000000000007','50000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',30,35,'accepted');
insert into public.tasks(id,project_id,title,assigned_to,created_by) values
 ('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Worker task',
  '10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","email":"worker-a@test.invalid","role":"authenticated"}',true);
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
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","email":"client-a@test.invalid","role":"authenticated"}',true);
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
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","email":"foreman-a@test.invalid","role":"authenticated"}',true);
select is((select count(*) from public.stage_reports where id='70000000-0000-4000-8000-000000000001'),0::bigint,
 'foreman from tenant A cannot read tenant B report');
select throws_ok($$select public.review_stage_reports(array['70000000-0000-4000-8000-000000000001']::uuid[])$$,
 'P0001','report_not_reviewable','foreman from tenant A cannot confirm tenant B report');
select is(public.review_stage_reports(array['70000000-0000-4000-8000-000000000002']::uuid[]),1,
 'foreman can batch confirm a different reporter report with a jump at or under threshold');
select public.update_stage_progress('50000000-0000-4000-8000-000000000001',35);
select is(
  (with first_confirmation as materialized (
     select public.review_stage_reports(array['70000000-0000-4000-8000-000000000006']::uuid[]) as result
   ), second_confirmation as materialized (
     select public.review_stage_reports(array['70000000-0000-4000-8000-000000000007']::uuid[]) as result
     from first_confirmation
   )
   select first_confirmation.result=1 and second_confirmation.result=1
     and (select progress_percent from public.project_stages where id='50000000-0000-4000-8000-000000000001')=35
   from first_confirmation cross join second_confirmation),
  true,
  'confirming two sent reports in sequence does not roll the stage back'
);
select throws_ok($$select public.review_stage_reports(array['70000000-0000-4000-8000-000000000003']::uuid[])$$,
 'P0001','report_not_reviewable','foreman cannot batch confirm own report');
select is(public.review_stage_report('70000000-0000-4000-8000-000000000004',true,null),'confirmed',
 'foreman can individually confirm a large jump from another reporter');
select throws_ok($$select public.review_stage_report('70000000-0000-4000-8000-000000000005',true,null)$$,
 'P0001','self_review_forbidden','foreman cannot individually confirm own report');
select lives_ok($$select public.update_stage_progress('50000000-0000-4000-8000-000000000001',5)$$,'foreman can update stage through RPC');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000007","email":"outsider@other.invalid","role":"authenticated"}',true);
select is(public.current_user_company_id(),null::uuid,'account with an email outside the firm domain has no company scope');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000008","email":"owner@gmail.com","role":"authenticated"}',true);
select is(public.current_user_company_id(),'30000000-0000-4000-8000-000000000003'::uuid,
 'Gmail owner retains access to own firm');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000010","email":"stranger@gmail.com","role":"authenticated"}',true);
select is(public.current_user_company_id(),null::uuid,
 'different Gmail address without an exact invitation is rejected');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000009","email":"crew@gmail.com","role":"authenticated"}',true);
select is(public.current_user_company_id(),'30000000-0000-4000-8000-000000000003'::uuid,
 'exact invited Gmail address is admitted');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000012","email":"crew@firma.ee","role":"authenticated"}',true);
select is(public.current_user_company_id(),'30000000-0000-4000-8000-000000000004'::uuid,
 'corporate domain member is admitted by matching firm domain');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000013","email":"oldcrew@gmail.com","role":"authenticated"}',true);
select is(
  public.current_user_company_id()='30000000-0000-4000-8000-000000000003'::uuid
  and (select count(*)=1 from public.invite_log where company_id='30000000-0000-4000-8000-000000000003' and email='oldcrew@gmail.com'),
  true,
  'backfilled exact invite preserves access for an existing public-mail worker without duplicates'
);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000005","email":"onboarding-a@test.invalid","role":"authenticated"}',true);
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
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","email":"gc-a@test.invalid","role":"authenticated"}',true);
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
