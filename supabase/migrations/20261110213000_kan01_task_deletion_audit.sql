-- KAN-DEL-01: explicit deletion audit retained outside task cascade.
-- Deployment: apply additively before enabling the DELETE /api/tasks route.
create table if not exists public.project_task_deletion_audit (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 project_id uuid not null references public.projects(id),
 task_id uuid not null unique,
 snapshot jsonb not null,
 deleted_by uuid not null,
 deleted_at timestamptz not null default now()
);
create index if not exists project_task_deletion_audit_scope_idx
 on public.project_task_deletion_audit(organization_id,project_id,deleted_at desc);
alter table public.project_task_deletion_audit enable row level security;
revoke all on public.project_task_deletion_audit from anon,authenticated;
grant select,insert,delete on public.project_task_deletion_audit to service_role;
create or replace function public.project_task_deletion_audit_guard()
returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.projects p where p.id=new.project_id and p.organization_id=new.organization_id) then
  raise exception 'Task deletion audit tenant/project mismatch';
 end if;
 return new;
end $$;
drop trigger if exists project_task_deletion_audit_guard_trigger on public.project_task_deletion_audit;
create trigger project_task_deletion_audit_guard_trigger before insert on public.project_task_deletion_audit
for each row execute function public.project_task_deletion_audit_guard();
