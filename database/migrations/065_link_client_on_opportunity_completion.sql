-- 7Commander: conclusão idempotente do planejamento, no contexto da organização.
CREATE OR REPLACE FUNCTION public.commander_complete_opportunity(
 p_record_id uuid, p_actor_id uuid, p_organization_id uuid
) RETURNS TABLE(project_id uuid, already_created boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE rec public.commander_planning_records%ROWTYPE; new_id uuid; client_ref uuid; linked_prospect uuid;
BEGIN
 IF auth.role() <> 'service_role' THEN
  RAISE EXCEPTION 'Operation restricted to server service role';
 END IF;
 SELECT * INTO rec FROM public.commander_planning_records
  WHERE id=p_record_id AND organization_id=p_organization_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Opportunity not found in active organization'; END IF;
 IF rec.kind <> 'opportunity' OR rec.status NOT IN ('approved','won') THEN
  RAISE EXCEPTION 'Opportunity must be approved or won';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.organization_members m
   WHERE m.user_id=p_actor_id AND m.organization_id=p_organization_id AND m.status='active'
     AND m.role IN ('owner','admin','manager')) THEN
  RAISE EXCEPTION 'Actor cannot complete planning for this company';
 END IF;
 IF rec.project_id IS NOT NULL THEN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id=rec.project_id AND p.organization_id=p_organization_id) THEN
   RAISE EXCEPTION 'Linked project belongs to another organization or is missing';
  END IF;
  project_id:=rec.project_id; already_created:=true; RETURN NEXT; RETURN;
 END IF;
 IF coalesce(rec.payload->>'prospectId','') ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}
 VALUES (p_actor_id,p_organization_id,client_ref,rec.title,rec.description,'ativo',false,ARRAY[]::text[],'Origem: oportunidade '||rec.id::text)
 RETURNING id INTO new_id;
 UPDATE public.commander_planning_records
 SET project_id=new_id,updated_by=p_actor_id,updated_at=now(),version=version+1
 WHERE id=rec.id AND organization_id=p_organization_id;
 INSERT INTO public.commander_planning_audit (record_id,version,actor_id,action,snapshot)
 SELECT r.id,r.version,p_actor_id,'project_created',to_jsonb(r)
 FROM public.commander_planning_records r WHERE r.id=rec.id;
 project_id:=new_id; already_created:=false; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.commander_complete_opportunity(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commander_complete_opportunity(uuid,uuid,uuid) TO service_role;
 THEN
  linked_prospect:=(rec.payload->>'prospectId')::uuid;
  SELECT pr.converted_client_id INTO client_ref
    FROM public.commander_planning_records pr
    JOIN public.clients cl ON cl.id=pr.converted_client_id AND cl.organization_id=p_organization_id
   WHERE pr.id=linked_prospect AND pr.organization_id=p_organization_id AND pr.kind='prospect';
 END IF;
 INSERT INTO public.projects (user_id,organization_id,client_id,nome,descricao,status,ativo,tags,contexto)
 VALUES (p_actor_id,p_organization_id,rec.title,rec.description,'ativo',false,ARRAY[]::text[])
 RETURNING id INTO new_id;
 UPDATE public.commander_planning_records
 SET project_id=new_id,updated_by=p_actor_id,updated_at=now(),version=version+1
 WHERE id=rec.id AND organization_id=p_organization_id;
 INSERT INTO public.commander_planning_audit (record_id,version,actor_id,action,snapshot)
 SELECT r.id,r.version,p_actor_id,'project_created',to_jsonb(r)
 FROM public.commander_planning_records r WHERE r.id=rec.id;
 project_id:=new_id; already_created:=false; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.commander_complete_opportunity(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commander_complete_opportunity(uuid,uuid,uuid) TO service_role;
