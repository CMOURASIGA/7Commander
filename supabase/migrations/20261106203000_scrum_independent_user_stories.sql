-- Isolated Scrum User Stories, independent of the operational Kanban tasks.
create table if not exists public.scrum_user_stories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  sprint_id uuid null,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text not null default '',
  acceptance_criteria text not null default '',
  priority text not null default 'media' check(priority in ('baixa','media','alta','critica')),
  responsible text,
  workflow_stage text not null default 'new' check(workflow_stage in ('new','review','rework','ready','active','resolved','closed','rejected')),
  start_date date,
  due_date date,
  duration_days integer check(duration_days between 1 and 3650),
  story_points numeric(7,2) check(story_points between 0 and 9999),
  blocked boolean not null default false,
  blocker_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (sprint_id, project_id, organization_id) references public.scrum_sprints(id,project_id,organization_id) on delete restrict,
  check (start_date is null or due_date is null or due_date >= start_date),
  unique(id,project_id,organization_id)
);
create index if not exists scrum_stories_project_idx on public.scrum_user_stories(organization_id,project_id,sprint_id,created_at);
create index if not exists scrum_stories_sprint_idx on public.scrum_user_stories(sprint_id,workflow_stage);

create table if not exists public.scrum_story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.scrum_user_stories(id) on delete cascade,
  organization_id uuid not null,
  project_id uuid not null,
  author_user_id uuid not null,
  author_email text,
  content text not null check(char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  foreign key(story_id,project_id,organization_id) references public.scrum_user_stories(id,project_id,organization_id) on delete cascade
);
create index if not exists scrum_comments_story_idx on public.scrum_story_comments(story_id,created_at);
-- Block mutation/deletion of stories associated with a closed Sprint, regardless of API.
create or replace function public.scrum_guard_closed_story() returns trigger
language plpgsql set search_path=public as $$
declare sid uuid;
begin
  sid := case when TG_OP='DELETE' then old.sprint_id else old.sprint_id end;
  if sid is not null and exists (select 1 from public.scrum_sprints s where s.id=sid and s.status='closed') then
    raise exception 'Closed Sprint stories are immutable';
  end if;
  return case when TG_OP='DELETE' then old else new end;
end; $$;
drop trigger if exists scrum_guard_closed_story_trigger on public.scrum_user_stories;
create trigger scrum_guard_closed_story_trigger before update or delete on public.scrum_user_stories
for each row execute function public.scrum_guard_closed_story();

-- Safely copy historic Scrum entries into independent US without modifying original Kanban cards.
insert into public.scrum_user_stories
(organization_id,project_id,sprint_id,title,description,priority,responsible,workflow_stage,start_date,due_date,duration_days,story_points,blocked,blocker_reason,created_at)
select l.organization_id,l.project_id,l.sprint_id,t.titulo,coalesce(t.descricao,''),coalesce(t.prioridade,'media'),
t.responsavel,l.workflow_stage,l.planned_start_date,l.planned_end_date,l.duration_days,l.story_points,l.blocked,l.blocker_reason,t.created_at
from public.scrum_sprint_tasks l join public.tasks t on t.id=l.task_id
where not exists (
 select 1 from public.scrum_user_stories us where us.project_id=l.project_id and us.sprint_id=l.sprint_id and us.title=t.titulo
);
alter table public.scrum_user_stories enable row level security;
alter table public.scrum_story_comments enable row level security;
revoke all on public.scrum_user_stories from anon,authenticated;
revoke all on public.scrum_story_comments from anon,authenticated;
