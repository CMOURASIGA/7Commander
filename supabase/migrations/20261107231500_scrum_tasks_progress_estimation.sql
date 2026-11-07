alter table public.scrum_user_stories add column if not exists actual_end_date date;
alter table public.scrum_backlog_items add column if not exists responsible text;
alter table public.scrum_backlog_items add column if not exists actual_end_date date;
update public.scrum_backlog_items set state='todo' where item_type='task' and state='new';
update public.scrum_backlog_items set state='doing' where item_type='task' and state='active';
update public.scrum_backlog_items set state='done' where item_type='task' and state in ('resolved','closed');
alter table public.scrum_backlog_items drop constraint if exists scrum_backlog_items_state_check;
alter table public.scrum_backlog_items add constraint scrum_backlog_items_state_check check (
  (item_type='task' and state in ('todo','doing','done')) or
  (item_type in ('epic','feature') and state in ('new','ready','active','resolved','closed','review','rejected'))
);
alter table public.scrum_user_stories drop constraint if exists scrum_user_stories_story_points_check;
alter table public.scrum_user_stories add constraint scrum_user_stories_story_points_check check(story_points in (1,2,3,4) or story_points is null);
create or replace function public.scrum_guard_task_story() returns trigger language plpgsql set search_path=public as $$
declare story_status text; sprint_state text; old_state text;
begin
 if new.item_type<>'task' then return new; end if;
 select u.workflow_stage,s.status into story_status,sprint_state
 from public.scrum_user_stories u left join public.scrum_sprints s on s.id=u.sprint_id
 where u.id=new.story_id and u.project_id=new.project_id and u.organization_id=new.organization_id;
 if story_status is null then raise exception 'US not found'; end if;
 if story_status='closed' or sprint_state='closed' then raise exception 'Closed US or Sprint: Tasks are immutable'; end if;
 if tg_op='UPDATE' then
   old_state:=old.state;
   if new.state<>old_state and not ((old_state='todo' and new.state='doing') or (old_state='doing' and new.state in ('todo','done')) or (old_state='done' and new.state='doing')) then
     raise exception 'Invalid Task transition';
   end if;
 end if;
 if new.state='done' then new.actual_end_date:=coalesce(new.actual_end_date,current_date);
 elsif tg_op='UPDATE' and old.state='done' and new.state<>'done' then new.actual_end_date:=null; end if;
 return new;
end; $$;
drop trigger if exists scrum_guard_task_story_trigger on public.scrum_backlog_items;
create trigger scrum_guard_task_story_trigger before insert or update on public.scrum_backlog_items for each row execute function public.scrum_guard_task_story();
create or replace function public.scrum_task_progress() returns trigger language plpgsql security definer set search_path=public as $$
declare st uuid; total_count integer; pending_count integer; current_stage text;
begin
 st:=case when tg_op='DELETE' then old.story_id else new.story_id end;
 if st is null then return null; end if;
 select count(*),count(*) filter(where state<>'done') into total_count,pending_count from public.scrum_backlog_items where item_type='task' and story_id=st;
 select workflow_stage into current_stage from public.scrum_user_stories where id=st;
 if total_count>0 and pending_count=0 and current_stage='active' then
  update public.scrum_user_stories set workflow_stage='resolved',last_actor_email=coalesce((select last_actor_email from public.scrum_user_stories where id=st),'system@internal.invalid'),transition_comment='Todas as Tasks foram concluídas. US encaminhada para validação.',actual_end_date=current_date,updated_at=now() where id=st;
 end if;
 return null;
end; $$;
drop trigger if exists scrum_task_progress_trigger on public.scrum_backlog_items;
create trigger scrum_task_progress_trigger after insert or update of state or delete on public.scrum_backlog_items for each row execute function public.scrum_task_progress();
