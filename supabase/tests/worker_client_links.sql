begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(17);

insert into public.companies(id,name) values
 ('90000000-0000-4000-8000-000000000001','Link tenant A'),
 ('90000000-0000-4000-8000-000000000002','Link tenant B');
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('91000000-0000-4000-8000-000000000001','authenticated','authenticated','owner@links.test','',now(),'{}','{}',now(),now()),
 ('91000000-0000-4000-8000-000000000002','authenticated','authenticated','worker@links.test','',now(),'{}','{}',now(),now()),
 ('91000000-0000-4000-8000-000000000003','authenticated','authenticated','foreman@links.test','',now(),'{}','{}',now(),now());
insert into public.profiles(id,company_id,full_name,role) values
 ('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','Owner','gc'),
 ('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','Worker','worker'),
 ('91000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000001','Foreman','foreman');
insert into public.projects(id,company_id,name) values
 ('92000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','Project A'),
 ('92000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000002','Project B');
insert into public.project_stages(id,project_id,stage_template_id)
 select '93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',id from public.stage_templates where sort_order=1;
insert into public.project_stages(id,project_id,stage_template_id)
 select '93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001',id from public.stage_templates where sort_order=2;
insert into public.project_stages(id,project_id,stage_template_id)
 select '93000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000002',id from public.stage_templates where sort_order=1;
insert into public.worker_links(id,project_id,display_name,token_hash,created_by,expires_at,revoked_at) values
 ('94000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Worker A',encode(digest('worker-good-token','sha256'),'hex'),'91000000-0000-4000-8000-000000000001',now()+interval '1 day',null),
 ('94000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','Worker B',encode(digest('worker-foreign-token','sha256'),'hex'),'91000000-0000-4000-8000-000000000001',now()+interval '1 day',null),
 ('94000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','Revoked',encode(digest('worker-revoked-token','sha256'),'hex'),'91000000-0000-4000-8000-000000000001',now()+interval '1 day',now()),
 ('94000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000001','Expired',encode(digest('worker-expired-token','sha256'),'hex'),'91000000-0000-4000-8000-000000000001',now()-interval '1 second',null);
insert into public.client_links(id,project_id,display_name,token_hash,created_by,expires_at,revoked_at) values
 ('95000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Client A',encode(digest('client-good-token','sha256'),'hex'),'91000000-0000-4000-8000-000000000001',now()+interval '1 day',null),
 ('95000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','Revoked',encode(digest('client-revoked-token','sha256'),'hex'),'91000000-0000-4000-8000-000000000001',now()+interval '1 day',now()),
 ('95000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','Expired',encode(digest('client-expired-token','sha256'),'hex'),'91000000-0000-4000-8000-000000000001',now()-interval '1 second',null);
insert into public.stage_reports(id,project_stage_id,project_id,reporter_id,old_percent,new_percent,status,confirmed_percent,reviewed_by,reviewed_at,comment)
 values
 ('96000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002',0,40,'confirmed',40,'91000000-0000-4000-8000-000000000003',now(),'internal note'),
 ('96000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002',40,50,'accepted',50,null,null,'not public'),
 ('96000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002',50,80,'pending',50,null,null,'not public'),
 ('96000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002',0,25,'confirmed',25,'91000000-0000-4000-8000-000000000003',now(),'hidden stage'),
 ('96000000-0000-4000-8000-000000000005','93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001',0,10,'accepted',10,null,null,'owner report');
insert into public.stage_reports(id,project_stage_id,project_id,reporter_id,worker_link_id,old_percent,new_percent,claimed_percent,status,confirmed_percent,device_time,uploaded_at)
 values
 ('96000000-0000-4000-8000-000000000006','93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',null,'94000000-0000-4000-8000-000000000001',0,5,5,'accepted',5,now(),now()),
 ('96000000-0000-4000-8000-000000000007','93000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000002',null,'94000000-0000-4000-8000-000000000002',0,5,5,'accepted',5,now(),now());
insert into public.photos(project_id,project_stage_id,storage_path,report_id) values
 ('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001/confirmed.jpg','96000000-0000-4000-8000-000000000001');
insert into public.project_stage_client_visibility(project_id,project_stage_id,visible,photos_visible) values
 ('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',true,false);

select is((select relrowsecurity from pg_class where oid='public.worker_links'::regclass),true,'worker link table has RLS enabled');
select is((select relrowsecurity from pg_class where oid='public.client_links'::regclass),true,'client link table has RLS enabled');
select is(has_function_privilege('anon','public.submit_worker_link_report(text,uuid,integer,timestamptz,timestamptz,text[],text,uuid,text)','EXECUTE'),false,
 'anonymous users cannot invoke the service-role worker submission RPC');

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is(public.worker_link_stages('worker-good-token')->>'project_id','92000000-0000-4000-8000-000000000001','worker token lists only its assigned object');
select throws_ok($$select public.worker_link_stages('worker-revoked-token')$$,'P0001','invalid_worker_link','revoked worker token is rejected');
select throws_ok($$select public.worker_link_stages('worker-expired-token')$$,'P0001','invalid_worker_link','expired worker token is rejected');
select throws_ok($$select public.submit_worker_link_report('worker-good-token','93000000-0000-4000-8000-000000000003',10,null,now(),array['92000000-0000-4000-8000-000000000001/worker-links/94000000-0000-4000-8000-000000000001/photo.jpg'],null,'97000000-0000-4000-8000-000000000001',null)$$,
 'P0001','stage_not_found','worker link cannot submit to a stage in another object');
select is(jsonb_array_length(public.worker_link_reports('worker-good-token')),1,'worker link reads only its own recent reports');
select is(has_function_privilege('anon','public.review_stage_report(uuid,boolean,text)','EXECUTE'),false,
 'bearer links have no report-confirmation RPC grant');
select is(public.client_project_view('client-good-token',null,null)->>'project_id','92000000-0000-4000-8000-000000000001','client token returns only its object');
select is(
  jsonb_array_length(public.client_project_view('client-good-token',null,null)->'stages')=1
  and (public.client_project_view('client-good-token',null,null)->'stages'->0->>'confirmed_percent')::integer=40
  and public.client_project_view('client-good-token',null,null)->>'disclaimer'='client.disclaimer.percentNotPayment'
  and (public.client_project_view('client-good-token',null,null)->'stages'->0->'photos')='[]'::jsonb,
  true,'client sees only verified visible stages, no internal comments, and no photos without separate consent'
);
select is(
  public.client_project_view(null,'92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001')->'stages'
  =public.client_project_view('client-good-token',null,null)->'stages',
  true,'owner preview uses the identical filtered view data as the client token'
);
select throws_ok($$select public.client_project_view('client-revoked-token',null,null)$$,'P0001','invalid_client_link','revoked client token is rejected');
select throws_ok($$select public.client_project_view('client-expired-token',null,null)$$,'P0001','invalid_client_link','expired client token is rejected');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","email":"owner@links.test","role":"authenticated"}',true);
select is(public.review_stage_reports(array['96000000-0000-4000-8000-000000000002']::uuid[]),1,'owner can batch confirm reports');
select is(public.review_stage_report('96000000-0000-4000-8000-000000000003',true,null),'confirmed','owner can individually confirm a large report');
select throws_ok($$select public.review_stage_reports(array['96000000-0000-4000-8000-000000000005']::uuid[])$$,
 'P0001','report_not_reviewable','owner cannot confirm their own report');
reset role;
select * from finish();
rollback;
