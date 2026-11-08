-- Hierarquia do backlog de desenvolvimento, independente do Kanban operacional.
create table if not exists public.scrum_backlog_items (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 project_id uuid not null references public.projects(id) on delete cascade,
 item_type text not null check(item_type in ('epic','feature','task')),
 title text not null check(length(trim(title)) between 1 and 180),
 description text not null default '',
 state text not null default 'new' check(state in ('new','ready','active','resolved','closed','review','rejected')),
 parent_id uuid,
 story_id uuid,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,project_id,organization_id),
 foreign key(parent_id,project_id,organization_id) references public.scrum_backlog_items(id,project_id,organization_id) on delete restrict,
 foreign key(story_id,project_id,organization_id) references public.scrum_user_stories(id,project_id,organization_id) on delete restrict,
 check ((item_type='epic' and parent_id is null and story_id is null) or (item_type='feature' and parent_id is not null and story_id is null) or (item_type='task' and story_id is not null and parent_id is null))
);
alter table public.scrum_user_stories add column if not exists feature_id uuid;
alter table public.scrum_user_stories add column if not exists sort_order integer not null default 0;
alter table public.scrum_user_stories add constraint scrum_story_feature_fk foreign key(feature_id,project_id,organization_id) references public.scrum_backlog_items(id,project_id,organization_id) on delete restrict;
create index if not exists scrum_backlog_items_project_idx on public.scrum_backlog_items(organization_id,project_id,item_type,parent_id,sort_order);
create index if not exists scrum_stories_feature_idx on public.scrum_user_stories(organization_id,project_id,feature_id,sort_order);
create or replace function public.scrum_validate_hierarchy() returns trigger language plpgsql set search_path=public as $$
begin
 if new.item_type='feature' and not exists(select 1 from public.scrum_backlog_items p where p.id=new.parent_id and p.item_type='epic' and p.project_id=new.project_id and p.organization_id=new.organization_id) then
  raise exception 'Feature must be linked to an Epic in the same project';
 end if;
 return new;
end; $$;
drop trigger if exists scrum_validate_hierarchy_trigger on public.scrum_backlog_items;
create trigger scrum_validate_hierarchy_trigger before insert or update on public.scrum_backlog_items for each row execute function public.scrum_validate_hierarchy();
create or replace function public.scrum_validate_story_feature() returns trigger language plpgsql set search_path=public as $$
begin
 if new.feature_id is not null and not exists(select 1 from public.scrum_backlog_items p where p.id=new.feature_id and p.item_type='feature' and p.project_id=new.project_id and p.organization_id=new.organization_id) then
  raise exception 'User Story must be linked to a Feature in the same project';
 end if;
 return new;
end; $$;
drop trigger if exists scrum_validate_story_feature_trigger on public.scrum_user_stories;
create trigger scrum_validate_story_feature_trigger before insert or update on public.scrum_user_stories for each row execute function public.scrum_validate_story_feature();
alter table public.scrum_backlog_items enable row level security;
revoke all on public.scrum_backlog_items from anon,authenticated;
