-- Transactional deletion of a project with no operational history.
-- Risks created in error and empty Kanban boards are removed; substantial linked records block deletion.
create or replace function public.delete_empty_project_with_risks(
 p_project_id uuid, p_actor_id uuid, p_confirm_name text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_name text; v_risks integer;
begin
 if not exists(select 1 from public.platform_admins where user_id=p_actor_id and active=true and role in ('superadmin','super_admin','owner','admin')) then
  raise exception 'Sem permissao para excluir projetos';
 end if;
 select nome into v_name from public.projects where id=p_project_id for update;
 if not found then raise exception 'Projeto nao encontrado'; end if;
 if p_confirm_name is distinct from v_name then raise exception 'Nome do projeto nao corresponde'; end if;
 if exists(select 1 from public.tasks where project_id=p_project_id)
 or exists(select 1 from public.conversations where project_id=p_project_id)
 or exists(select 1 from public.decisions where project_id=p_project_id)
 or exists(select 1 from public.knowledge_base where project_id=p_project_id)
 or exists(select 1 from public.knowledge_chunks where project_id=p_project_id)
 or exists(select 1 from public.knowledge_embeddings where project_id=p_project_id)
 or exists(select 1 from public.task_members where project_id=p_project_id)
 or exists(select 1 from public.task_labels where project_id=p_project_id)
 or exists(select 1 from public.task_daily_selections where project_id=p_project_id)
 then raise exception 'Projeto contem historico operacional. Arquive-o antes de excluir'; end if;
 select count(*) into v_risks from public.risks where project_id=p_project_id;
 delete from public.risks where project_id=p_project_id;
 delete from public.projects where id=p_project_id;
 return jsonb_build_object('deleted',true,'risks_deleted',v_risks);
end;$$;
revoke all on function public.delete_empty_project_with_risks(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.delete_empty_project_with_risks(uuid,uuid,text) to service_role;