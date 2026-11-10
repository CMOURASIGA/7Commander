-- REP-01: explicitly reviewed public facts for client status reports.
-- QA only until approved. No existing task, risk or decision is made public.
create table if not exists public.project_report_public_facts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 project_id uuid not null references public.projects(id),
 kind text not null check(kind in ('objective','benefit','deliverable','milestone','risk','next_step')),
 title text not null check(char_length(btrim(title)) between 3 and 180),
 description text not null default '',
 classification text not null check(classification in ('confirmed','in_progress','hypothesis','ai_recommendation')),
 due_date date,
 source_reference text,
 approved_for_client boolean not null default false,
 approved_by uuid,
 approved_at timestamptz,
 created_by uuid not null,
 updated_by uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint rep01_approval_consistent check ((not approved_for_client and approved_by is null and approved_at is null) or (approved_for_client and approved_by is not null and approved_at is not null))
);
create index if not exists rep01_public_facts_scope on public.project_report_public_facts(organization_id,project_id,approved_for_client,kind,created_at desc);
alter table public.project_report_public_facts enable row level security;
revoke all on public.project_report_public_facts from anon,authenticated;
grant select,insert,update on public.project_report_public_facts to service_role;
create or replace function public.rep01_public_fact_guard()
returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.projects where id=new.project_id and organization_id=new.organization_id) then
  raise exception 'Invalid report fact tenant/project';
 end if;
 if tg_op='UPDATE' and (old.organization_id<>new.organization_id or old.project_id<>new.project_id) then
  raise exception 'Fact tenant and project cannot be changed';
 end if;
 return new;
end; $$;
drop trigger if exists rep01_fact_guard_trg on public.project_report_public_facts;
create trigger rep01_fact_guard_trg before insert or update on public.project_report_public_facts
for each row execute function public.rep01_public_fact_guard();
create table if not exists public.project_report_public_fact_history (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 project_id uuid not null,
 fact_id uuid not null references public.project_report_public_facts(id),
 old_approved boolean not null,
 new_approved boolean not null,
 old_classification text,
 new_classification text,
 changed_by uuid,
 changed_at timestamptz not null default now()
);
create index if not exists rep01_history_scope on public.project_report_public_fact_history(organization_id,project_id,fact_id,changed_at desc);
alter table public.project_report_public_fact_history enable row level security;
revoke all on public.project_report_public_fact_history from anon,authenticated;
grant select,insert on public.project_report_public_fact_history to service_role;
create or replace function public.rep01_fact_audit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.approved_for_client is distinct from new.approved_for_client or old.classification is distinct from new.classification then
  insert into public.project_report_public_fact_history(organization_id,project_id,fact_id,old_approved,new_approved,old_classification,new_classification,changed_by)
   values(new.organization_id,new.project_id,new.id,old.approved_for_client,new.approved_for_client,old.classification,new.classification,new.updated_by);
 end if;
 return new;
end; $$;
drop trigger if exists rep01_fact_audit_trg on public.project_report_public_facts;
create trigger rep01_fact_audit_trg after update on public.project_report_public_facts
for each row execute function public.rep01_fact_audit();
