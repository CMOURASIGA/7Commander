alter table public.tasks add column if not exists source_ref text;
create unique index if not exists tasks_project_source_ref_unique
on public.tasks(project_id,source_ref) where source_ref is not null;
comment on column public.tasks.source_ref is 'Idempotency key for approved backlog generation (project + decision + requirement).';