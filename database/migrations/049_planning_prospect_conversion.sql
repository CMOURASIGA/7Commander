alter table public.commander_planning_records
 add column if not exists converted_client_id uuid references public.clients(id) on delete restrict;
create or replace function public.convert_commander_prospect(p_record_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item public.commander_planning_records%rowtype; new_client uuid;
begin
 select * into item from public.commander_planning_records where id=p_record_id for update;
 if not found or item.kind <> 'prospect' then raise exception 'Prospect não encontrado'; end if;
 if not exists(select 1 from public.organization_members m where m.user_id=p_actor_id
 and m.organization_id=item.organization_id and m.status='active' and m.role in ('owner','admin','manager'))
 then raise exception 'Sem permissão para conversão'; end if;
 if item.status <> 'won' then raise exception 'Prospect precisa estar marcado como ganho antes da conversão'; end if;
 if item.converted_client_id is not null then
  return jsonb_build_object('client_id',item.converted_client_id,'already_converted',true);
 end if;
 if exists(select 1 from public.clients c where lower(trim(c.nome))=lower(trim(item.title))
 and c.user_id in (select m.user_id from public.organization_members m
 where m.organization_id=item.organization_id and m.status='active'))
 then raise exception 'Cliente com o mesmo nome já existe. Revise e associe manualmente para evitar duplicidade'; end if;
 insert into public.clients(user_id,nome,descricao,status)
 values(p_actor_id,item.title,nullif(item.description,''),'ativo') returning id into new_client;
 update public.commander_planning_records set converted_client_id=new_client,
  version=item.version+1,updated_by=p_actor_id,updated_at=now() where id=p_record_id;
 insert into public.commander_planning_audit(record_id,version,actor_id,action,snapshot)
 select id,version,p_actor_id,'converted',to_jsonb(r) from public.commander_planning_records r where id=p_record_id;
 return jsonb_build_object('client_id',new_client,'already_converted',false);
end;$$;
revoke all on function public.convert_commander_prospect(uuid,uuid) from public,anon,authenticated;
grant execute on function public.convert_commander_prospect(uuid,uuid) to service_role;