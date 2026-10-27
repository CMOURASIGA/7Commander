-- 057: MULTITENANT CORE SCHEMA & RLS (candidate; apply only after isolated QA)
-- Prereq: 055 already reconciled. Does not alter production until explicitly executed.
BEGIN;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.projects WHERE organization_id IS NULL)
    OR EXISTS(SELECT 1 FROM public.clients WHERE organization_id IS NULL)
 THEN RAISE EXCEPTION 'Projects/clients with unknown tenant: abort'; END IF;
END $$;

-- Every project-based row inherits the tenant of its authoritative project.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.knowledge_base ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
UPDATE public.tasks r SET organization_id=p.organization_id FROM public.projects p WHERE r.project_id=p.id AND r.organization_id IS NULL;
UPDATE public.risks r SET organization_id=p.organization_id FROM public.projects p WHERE r.project_id=p.id AND r.organization_id IS NULL;
UPDATE public.decisions r SET organization_id=p.organization_id FROM public.projects p WHERE r.project_id=p.id AND r.organization_id IS NULL;
UPDATE public.knowledge_base r SET organization_id=p.organization_id FROM public.projects p WHERE r.project_id=p.id AND r.organization_id IS NULL;
UPDATE public.conversations r SET organization_id=p.organization_id FROM public.projects p WHERE r.project_id=p.id AND r.organization_id IS NULL;

DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.tasks WHERE organization_id IS NULL)
 OR EXISTS(SELECT 1 FROM public.risks WHERE organization_id IS NULL)
 OR EXISTS(SELECT 1 FROM public.decisions WHERE organization_id IS NULL)
 OR EXISTS(SELECT 1 FROM public.knowledge_base WHERE organization_id IS NULL)
 OR EXISTS(SELECT 1 FROM public.conversations WHERE organization_id IS NULL)
 THEN RAISE EXCEPTION 'Orphaned project resources; requires manual reconciliation'; END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS projects_id_org_uniq ON public.projects(id,organization_id);
-- Composite foreign keys prevent assigning a child's tenant different from its project.
ALTER TABLE public.tasks ADD CONSTRAINT tasks_tenant_project_fk FOREIGN KEY(project_id,organization_id) REFERENCES public.projects(id,organization_id);
ALTER TABLE public.risks ADD CONSTRAINT risks_tenant_project_fk FOREIGN KEY(project_id,organization_id) REFERENCES public.projects(id,organization_id);
ALTER TABLE public.decisions ADD CONSTRAINT decisions_tenant_project_fk FOREIGN KEY(project_id,organization_id) REFERENCES public.projects(id,organization_id);
ALTER TABLE public.knowledge_base ADD CONSTRAINT knowledge_tenant_project_fk FOREIGN KEY(project_id,organization_id) REFERENCES public.projects(id,organization_id);
ALTER TABLE public.conversations ADD CONSTRAINT conversations_tenant_project_fk FOREIGN KEY(project_id,organization_id) REFERENCES public.projects(id,organization_id);

-- Client must share tenant with referenced project.
CREATE UNIQUE INDEX IF NOT EXISTS clients_id_org_uniq ON public.clients(id,organization_id);
ALTER TABLE public.projects ADD CONSTRAINT projects_client_same_tenant_fk FOREIGN KEY(client_id,organization_id) REFERENCES public.clients(id,organization_id);

-- New or updated project-scoped resources receive tenant from their parent,
-- independent of client-provided organization_id.
CREATE OR REPLACE FUNCTION public.enforce_project_tenant() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE actual uuid;
BEGIN
 SELECT organization_id INTO actual FROM public.projects WHERE id=NEW.project_id;
 IF actual IS NULL THEN RAISE EXCEPTION 'Missing project or tenant' USING ERRCODE='23503'; END IF;
 IF NEW.organization_id IS NOT NULL AND NEW.organization_id<>actual THEN
  RAISE EXCEPTION 'Cross-tenant reference' USING ERRCODE='23514';
 END IF;
 NEW.organization_id=actual;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_project_tenant() FROM PUBLIC;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['tasks','risks','decisions','knowledge_base','conversations'] LOOP
 EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_tenant ON public.%I',t);
 EXECUTE format('CREATE TRIGGER trg_enforce_tenant BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_project_tenant()',t);
 END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['projects','clients','tasks','risks','decisions','knowledge_base','conversations'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('DROP POLICY IF EXISTS tenant_member_access ON public.%I',t);
 EXECUTE format('DROP POLICY IF EXISTS tenant_member_read_v2 ON public.%I',t);
 EXECUTE format('CREATE POLICY tenant_member_read_v2 ON public.%I FOR SELECT TO authenticated USING (organization_id IS NOT NULL AND public.is_organization_member(organization_id))',t);
 EXECUTE format('DROP POLICY IF EXISTS tenant_member_insert_v2 ON public.%I',t);
 EXECUTE format('DROP POLICY IF EXISTS tenant_member_update_v2 ON public.%I',t);
 EXECUTE format('DROP POLICY IF EXISTS tenant_member_delete_v2 ON public.%I',t);
 END LOOP;
END $$;

-- Authenticated clients may read only; all mutations go through the server\n-- authorization layer (service-role calls with verified membership/RBAC).\n-- Explicitly deny anonymous invocation of privileged membership helpers.
REVOKE EXECUTE ON FUNCTION public.is_organization_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_organization_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_organization_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
COMMIT;
