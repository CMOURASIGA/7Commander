-- PERF-04 | Índices seletivos para relacionamento multiempresa e hierarquia Scrum.
-- Implantação somente após avaliação no ambiente controlado.
-- Não altera RLS, permissões, constraints ou dados.
-- O linter do Supabase sinalizou FKs sem índice nessas relações.
create index if not exists idx_perf04_profiles_active_org
  on public.profiles (active_organization_id)
  where active_organization_id is not null;

create index if not exists idx_perf04_project_members_org
  on public.project_members (organization_id);

create index if not exists idx_perf04_backlog_parent_project_org
  on public.scrum_backlog_items (parent_id, project_id, organization_id)
  where parent_id is not null;
