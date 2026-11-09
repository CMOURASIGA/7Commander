-- KAI-02 / KAI-05: project meeting records, explicit traceability.
-- Prepared on develop only. Apply on QA database after security review.
create table if not exists public.project_meetings (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 project_id uuid not null references public.projects(id),
 created_by uuid not null,
 title text not null check (char_length(btrim(title)) between 3 and 180),
 held_at timestamptz not null,
 participants text not null default '',
 objective text not null default '',
 summary text not null default '',
 advances text not null default '',
 decisions text not null default '',
 commitments text not null default '',
 pending_items text not null default '',
 risks text not null default '',
 next_follow_up timestamptz,
 source_conversation_id uuid,
 source_artifact_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists project_meetings_tenant_project_date_idx
 on public.project_meetings(organization_id,project_id,held_at desc);
create table if not exists public.project_meeting_links (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 project_id uuid not null references public.projects(id),
 meeting_id uuid not null references public.project_meetings(id) on delete cascade,
 record_type text not null check(record_type in ('decision','risk','story','task','scrum_task','sprint','knowledge')),
 record_id uuid not null,
 created_by uuid not null,
 created_at timestamptz not null default now(),
 unique(meeting_id,record_type,record_id)
);
create index if not exists project_meeting_links_project_idx
 on public.project_meeting_links(organization_id,project_id,meeting_id);
alter table public.project_meetings enable row level security;
alter table public.project_meeting_links enable row level security;
-- Read/write only through authorized server endpoints; no direct user DML.
revoke all on public.project_meetings from anon,authenticated;
revoke all on public.project_meeting_links from anon,authenticated;
grant select,insert,update,delete on public.project_meetings to service_role;
grant select,insert,update,delete on public.project_meeting_links to service_role;
-- Cross-tenant integrity enforced even from privileged server transactions.
create or replace function public.project_meeting_tenant_guard()
returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.projects p where p.id=new.project_id and p.organization_id=new.organization_id) then
  raise exception 'Meeting/project tenant mismatch';
 end if;
 return new;
end; $$;
drop trigger if exists project_meeting_tenant_guard_trigger on public.project_meetings;
create trigger project_meeting_tenant_guard_trigger before insert or update on public.project_meetings
for each row execute function public.project_meeting_tenant_guard();
create or replace function public.project_meeting_link_guard()
returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.project_meetings m where m.id=new.meeting_id and m.organization_id=new.organization_id and m.project_id=new.project_id)
 then raise exception 'Meeting link project mismatch'; end if;
 return new;
end; $$;
drop trigger if exists project_meeting_link_guard_trigger on public.project_meeting_links;
create trigger project_meeting_link_guard_trigger before insert or update on public.project_meeting_links
for each row execute function public.project_meeting_link_guard();
