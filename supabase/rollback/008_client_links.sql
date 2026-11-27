drop function if exists public.client_project_view(text,uuid,uuid);
drop function if exists public.set_client_stage_visibility(uuid,uuid,uuid,boolean,boolean);
drop function if exists public.revoke_client_link(uuid,uuid);
drop function if exists public.create_client_link(uuid,uuid,text,text,timestamptz);
drop table if exists public.project_stage_client_visibility;
drop table if exists public.client_links;
