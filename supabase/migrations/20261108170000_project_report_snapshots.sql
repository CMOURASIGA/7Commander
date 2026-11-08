create table if not exists public.project_report_snapshots (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 project_id uuid not null references public.projects(id) on delete restrict,
 audience text not null check(audience in ('client','internal')),
 period_mode text not null check(period_mode in ('current','period')),
 period_start date,
 period_end date,
 generated_by uuid not null,
 generated_by_email text,
 report_data jsonb not null,
 narrative jsonb,
 created_at timestamptz not null default now(),
 check(period_mode='current' or (period_start is not null and period_end is not null and period_start<=period_end))
);
create index if not exists project_report_snapshots_lookup on public.project_report_snapshots(organization_id,project_id,created_at desc);
alter table public.project_report_snapshots enable row level security;
revoke all on public.project_report_snapshots from anon,authenticated;
