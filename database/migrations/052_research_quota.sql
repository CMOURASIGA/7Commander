create table if not exists public.commander_research_usage (
 id bigint generated always as identity primary key,
 organization_id uuid not null references public.organizations(id),
 actor_id uuid not null references auth.users(id),
 provider text not null default 'brave_web',
 created_at timestamptz not null default now()
);
create index if not exists commander_research_usage_day_idx on public.commander_research_usage(organization_id,created_at desc);
alter table public.commander_research_usage enable row level security;
revoke all on public.commander_research_usage from anon,authenticated;
create or replace function public.reserve_commander_research_request(p_org_id uuid,p_actor_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare usage_count integer; daily_limit integer:=10;
begin
 if not exists(select 1 from public.organization_members where organization_id=p_org_id and user_id=p_actor_id and status='active')
 then raise exception 'Usuário fora da organização'; end if;
 perform pg_advisory_xact_lock(hashtext(p_org_id::text),2026);
 select count(*) into usage_count from public.commander_research_usage
 where organization_id=p_org_id and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 if usage_count >= daily_limit then raise exception 'Limite diário de pesquisa atingido'; end if;
 insert into public.commander_research_usage(organization_id,actor_id) values (p_org_id,p_actor_id);
 return daily_limit - usage_count - 1;
end;$$;
revoke all on function public.reserve_commander_research_request(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_commander_research_request(uuid,uuid) to service_role;