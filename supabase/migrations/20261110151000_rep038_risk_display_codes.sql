-- REP-03.8: immutable display identifiers, scoped to each project.
-- Registry intentionally retains tombstones after deletion; counters are monotonic.
create table if not exists public.project_risk_code_counters(
 project_id uuid primary key,
 next_number bigint not null check(next_number>0)
);
create table if not exists public.project_risk_display_codes(
 risk_id uuid primary key,
 project_id uuid not null,
 organization_id uuid not null,
 code_number bigint not null check(code_number>0),
 assigned_at timestamptz not null default now(),
 unique(project_id,code_number)
);
create index if not exists idx_project_risk_codes_tenant
 on public.project_risk_display_codes(organization_id,project_id);
alter table public.project_risk_code_counters enable row level security;
alter table public.project_risk_display_codes enable row level security;
revoke all on public.project_risk_code_counters from public,anon,authenticated;
revoke all on public.project_risk_display_codes from public,anon,authenticated;
grant select,insert,update on public.project_risk_code_counters to service_role;
grant select,insert on public.project_risk_display_codes to service_role;

-- Backfill once, deterministically, preserving identifiers across report sorting.
with existing as (
 select id,project_id,organization_id,
 row_number() over(partition by project_id order by created_at,id) as code_number
 from public.risks
), assigned as (
 insert into public.project_risk_display_codes(risk_id,project_id,organization_id,code_number)
 select id,project_id,organization_id,code_number from existing
 on conflict(risk_id) do nothing returning project_id
)
select count(*) from assigned;

insert into public.project_risk_code_counters(project_id,next_number)
select project_id,max(code_number)+1 from public.project_risk_display_codes group by project_id
on conflict(project_id) do update
 set next_number=greatest(project_risk_code_counters.next_number,excluded.next_number);

create or replace function public.assign_project_risk_display_code()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public as $$
declare assigned_number bigint;
begin
 insert into public.project_risk_code_counters(project_id,next_number)
 values(new.project_id,2)
 on conflict(project_id) do update set next_number=public.project_risk_code_counters.next_number+1
 returning next_number-1 into assigned_number;
 insert into public.project_risk_display_codes(risk_id,project_id,organization_id,code_number)
 values(new.id,new.project_id,new.organization_id,assigned_number);
 return new;
end;
$$;
revoke all on function public.assign_project_risk_display_code() from public,anon,authenticated;
drop trigger if exists trg_project_risk_display_code on public.risks;
create trigger trg_project_risk_display_code
 after insert on public.risks for each row
 execute function public.assign_project_risk_display_code();
