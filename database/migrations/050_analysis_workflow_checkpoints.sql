create table if not exists public.commander_analysis_runs (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 project_id uuid not null references public.projects(id) on delete restrict,
 status text not null default 'iniciada' check(status in ('iniciada','requisitos','pesquisa','matriz','revisao','aprovada','rejeitada','pausada','falhou','cancelada')),
 checkpoint jsonb not null default '{}'::jsonb,
 baseline_version integer not null default 1,
 input_fingerprint text not null,
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,project_id,input_fingerprint)
);
create index if not exists commander_analysis_runs_project_idx on public.commander_analysis_runs(project_id,updated_at desc);
alter table public.commander_analysis_runs enable row level security;
revoke all on public.commander_analysis_runs from anon,authenticated;
comment on table public.commander_analysis_runs is 'Human-governed checkpoints only. No external search or LLM execution by this schema.';