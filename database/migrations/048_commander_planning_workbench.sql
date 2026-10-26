-- SPEC 01–05: controlled planning records, scoped to Consult Services.
create table if not exists public.commander_planning_records (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 project_id uuid references public.projects(id) on delete restrict,
 kind text not null check (kind in ('prospect','opportunity','requirement','research','assessment','decision_gate')),
 title text not null check (char_length(title) between 3 and 180),
 description text not null default '',
 status text not null default 'draft' check (status in ('draft','review','approved','rejected','won','lost','archived')),
 payload jsonb not null default '{}'::jsonb,
 source_url text,
 source_checked_at timestamptz,
 version integer not null default 1 check(version>0),
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists commander_planning_org_kind_idx on public.commander_planning_records(organization_id,kind,updated_at desc);
create index if not exists commander_planning_project_idx on public.commander_planning_records(project_id,updated_at desc);
alter table public.commander_planning_records enable row level security;
revoke all on public.commander_planning_records from anon,authenticated;
create table if not exists public.commander_planning_audit (
 id bigint generated always as identity primary key,
 record_id uuid not null references public.commander_planning_records(id) on delete cascade,
 version integer not null,
 actor_id uuid not null references auth.users(id),
 action text not null,
 snapshot jsonb not null,
 created_at timestamptz not null default now(),
 unique(record_id,version)
);
alter table public.commander_planning_audit enable row level security;
revoke all on public.commander_planning_audit from anon,authenticated;
comment on table public.commander_planning_records is 'Governed manual workbench: no automatic external search, AI approval, CRM conversion or autonomous action.';