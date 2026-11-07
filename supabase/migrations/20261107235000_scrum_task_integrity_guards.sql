create or replace function public.scrum_guard_task_story() returns trigger language plpgsql set search_path=public as $$
declare story_status text; sprint_state text; old_state text; story_ref uuid; project_ref uuid; org_ref uuid;
begin
 story_ref:=case when tg_op='DELETE' then old.story_id else new.story_id end;
 project_ref:=case when tg_op='DELETE' then old.project_id else new.project_id end;
 org_ref:=case when tg_op='DELETE' then old.organization_id else new.organization_id end;
 if case when tg_op='DELETE' then old.item_type<>'task' else new.item_type<>'task' end then return case when tg_op='DELETE' then old else new end; end if;
 select u.workflow_stage,s.status into story_status,sprint_state
 from public.scrum_user_stories u left join public.scrum_sprints s on s.id=u.sprint_id
 where u.id=story_ref and u.project_id=project_ref and u.organization_id=org_ref;
 if story_status is null then raise exception 'US not found'; end if;
 if story_status='closed' or sprint_state='closed' then raise exception 'Closed US or Sprint: Tasks are immutable'; end if;
 if tg_op='DELETE' then return old; end if;
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
create trigger scrum_guard_task_story_trigger before insert or update or delete on public.scrum_backlog_items for each row execute function public.scrum_guard_task_story();

create or replace function public.scrum_guard_us_task_completion() returns trigger language plpgsql set search_path=public as $$
begin
 if new.workflow_stage='resolved' and old.workflow_stage is distinct from new.workflow_stage
 and exists(select 1 from public.scrum_backlog_items t where t.story_id=new.id and t.item_type='task' and t.state<>'done') then
  raise exception 'US cannot resolve while Tasks are unfinished';
 end if;
 return new;
end; $$;
drop trigger if exists scrum_guard_us_task_completion_trigger on public.scrum_user_stories;
create trigger scrum_guard_us_task_completion_trigger before update on public.scrum_user_stories for each row execute function public.scrum_guard_us_task_completion();
