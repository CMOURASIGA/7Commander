create or replace function public.prevent_report_snapshot_mutation() returns trigger
language plpgsql set search_path=public as $$
begin
 raise exception 'Project report emissions are immutable. Create a new emission instead.';
end; $$;
drop trigger if exists project_report_snapshots_immutable on public.project_report_snapshots;
create trigger project_report_snapshots_immutable before update or delete on public.project_report_snapshots
for each row execute function public.prevent_report_snapshot_mutation();
