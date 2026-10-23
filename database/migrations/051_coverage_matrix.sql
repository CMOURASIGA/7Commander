create table if not exists public.commander_coverage_matrix (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 project_id uuid not null references public.projects(id) on delete restrict,
 requirement_id uuid not null references public.commander_planning_records(id) on delete restrict,
 alternative_id uuid not null references public.commander_planning_records(id) on delete restrict,
 status text not null default 'desconhecido' check(status in ('atende','parcial','nao_atende','desconhecido')),
 justification text not null default '',
 evidence_url text,
 evidence_checked_at timestamptz,
 verified boolean not null default false,
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint commander_coverage_unique unique(organization_id,project_id,requirement_id,alternative_id),
 constraint commander_coverage_requires_evidence check (not verified or (evidence_url is not null and evidence_checked_at is not null))
);
create index if not exists commander_coverage_project_idx on public.commander_coverage_matrix(project_id);
alter table public.commander_coverage_matrix enable row level security;
revoke all on public.commander_coverage_matrix from anon,authenticated;
comment on table public.commander_coverage_matrix is 'Never score unknown or unverified coverage. Evidence requires human review.';