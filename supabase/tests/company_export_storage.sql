begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(7);

insert into public.companies(id,name) values
 ('a1000000-0000-4000-8000-000000000001','Export firm A'),
 ('a1000000-0000-4000-8000-000000000002','Export firm B');
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('a2000000-0000-4000-8000-000000000001','authenticated','authenticated','owner-a@export.test','',now(),'{}','{}',now(),now()),
 ('a2000000-0000-4000-8000-000000000002','authenticated','authenticated','worker-a@export.test','',now(),'{}','{}',now(),now()),
 ('a2000000-0000-4000-8000-000000000003','authenticated','authenticated','owner-b@export.test','',now(),'{}','{}',now(),now());
insert into public.profiles(id,company_id,full_name,role) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Owner A','gc'),
 ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','Worker A','worker'),
 ('a2000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000002','Owner B','gc');
insert into public.projects(id,company_id,name) values
 ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','A project'),
 ('a3000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','B project');
insert into public.project_stages(id,project_id,stage_template_id)
 select 'a4000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001',id from public.stage_templates where sort_order=1;
insert into storage.buckets(id,name,public) values('project-photos','project-photos',false) on conflict(id) do nothing;

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is(public.export_company_data('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001')->>'company' is not null,true,
 'GC can export their own firm');
select is(jsonb_array_length(public.export_company_data('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001')->'projects'),1,
 'export contains only projects of the requested firm');
select throws_ok($$select public.export_company_data('a1000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001')$$,
 'P0001','forbidden','owner cannot export a different firm');
select throws_ok($$select public.export_company_data('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002')$$,
 'P0001','forbidden','non-GC cannot export company data');
insert into storage.objects(bucket_id,name,metadata) values
 ('project-photos','a3000000-0000-4000-8000-000000000001/near-limit.jpg','{"size":49999999999}'::jsonb);
select is(public.company_storage_usage('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001')->>'used_bytes','49999999999',
 'storage usage is aggregated by company');
select throws_ok($$insert into storage.objects(bucket_id,name,metadata) values
 ('project-photos','a3000000-0000-4000-8000-000000000001/over-limit.jpg','{"size":2}'::jsonb)$$,
 'P0001','company_storage_limit_exceeded','upload over firm storage limit is rejected');
select is((select count(*) from storage.objects where bucket_id='project-photos' and name like 'a3000000-0000-4000-8000-000000000001/%'),1::bigint,
 'rejecting a new upload preserves the previously stored file');
select * from finish();
rollback;
