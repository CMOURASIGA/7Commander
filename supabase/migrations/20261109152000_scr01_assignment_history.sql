-- SCR-01 | History of independent Epic and Feature ownership.
-- Applied only on controlled QA after review. Never overwrites assignments.
create table if not exists public.scrum_backlog_assignment_history (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 project_id uuid not null references public.projects(id),
 backlog_item_id uuid not null,
 item_type text not null check(item_type in ('epic','feature')),
 previous_responsible text,
 new_responsible text,
 changed_at timestamptz not null default now()
);
create index if not exists scrum_backlog_assignment_history_item_idx
 on public.scrum_backlog_assignment_history (organization_id,project_id,backlog_item_id,changed_at desc);
alter table public.scrum_backlog_assignment_history enable row level security;
revoke all on public.scrum_backlog_assignment_history from anon,authenticated;
grant select,insert on public.scrum_backlog_assignment_history to service_role;
create or replace function public.scrum_audit_backlog_assignment()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.item_type in ('epic','feature') and old.responsible is distinct from new.responsible then
  insert into public.scrum_backlog_assignment_history
   (organization_id,project_id,backlog_item_id,item_type,previous_responsible,new_responsible)
  values (new.organization_id,new.project_id,new.id,new.item_type,old.responsible,new.responsible);
 end if;
 return new;
end; $$;
drop trigger if exists scrum_backlog_assignment_audit_trigger on public.scrum_backlog_items;
create trigger scrum_backlog_assignment_audit_trigger after update of responsible
 on public.scrum_backlog_items for each row execute function public.scrum_audit_backlog_assignment();
