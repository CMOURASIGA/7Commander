-- Apply only after reviewing existing platform_admins roles and testing in staging.
create table if not exists public.internal_user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text not null,
  role text not null check (role in ('admin','gestor','colaborador','leitor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.internal_user_access enable row level security;
-- All reads/writes are server-side after JWT verification and administrator check.
revoke all on public.internal_user_access from anon, authenticated;
create index if not exists idx_internal_user_access_role on public.internal_user_access(role);
