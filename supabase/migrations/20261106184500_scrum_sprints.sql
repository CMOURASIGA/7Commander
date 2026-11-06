-- Scrum overlay on existing Kanban tasks. No duplicate task records.
-- Backend operates with service credentials after explicit tenant/project authorization.
create table if not exists public.scrum_sprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 140),
  goal text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null default 'planned' check(status in ('planned','active','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique(id, project_id, organization_id)
);
create index if not exists scrum_sprints_project_idx on public.scrum_sprints(organization_id, project_id, start_date desc);
create unique index if not exists scrum_single_active_sprint_idx on public.scrum_sprints(project_id) where status='active';

create table if not exists public.scrum_sprint_tasks (
  sprint_id uuid not null references public.scrum_sprints(id) on delete cascade,
  project_id uuid not null,
  organization_id uuid not null,
  task_id uuid not null references public.tasks(id) on delete cascade,
  planned_start_date date,
  planned_end_date date,
  duration_days integer check (duration_days between 1 and 3650),
  story_points numeric(7,2) check(story_points >= 0 and story_points <= 9999),
  workflow_stage text not null default 'new' check(workflow_stage in ('new','review','rework','ready','active','resolved','closed','rejected')),
  blocked boolean not null default false,
  blocker_reason text not null default '',
  updated_at timestamptz not null default now(),
  primary key(sprint_id, task_id),
  foreign key (sprint_id,project_id,organization_id) references public.scrum_sprints(id,project_id,organization_id) on delete cascade,
  check (planned_start_date is null or planned_end_date is null or planned_end_date >= planned_start_date)
);
create index if not exists scrum_sprint_tasks_lookup_idx on public.scrum_sprint_tasks(organization_id,project_id,task_id);
-- Prevent linking a task from another project/tenant even through service-role calls.
create or replace function public.scrum_validate_task_membership()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.tasks t where t.id=new.task_id and t.project_id=new.project_id and t.organization_id=new.organization_id)
  then raise exception 'Task does not belong to the sprint project and organization'; end if;
  return new;
end; $$;
drop trigger if exists scrum_validate_task_membership_trigger on public.scrum_sprint_tasks;
create trigger scrum_validate_task_membership_trigger before insert or update on public.scrum_sprint_tasks
for each row execute function public.scrum_validate_task_membership();

alter table public.scrum_sprints enable row level security;
alter table public.scrum_sprint_tasks enable row level security;
revoke all on public.scrum_sprints from anon, authenticated;
revoke all on public.scrum_sprint_tasks from anon, authenticated;
