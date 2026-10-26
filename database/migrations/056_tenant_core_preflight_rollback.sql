-- 056 Tenant-ready columns / PREVIEW ONLY - DO NOT EXECUTE ON PRODUCTION YET.
-- This migration depends on 055, reviewed per-table ownership and synthetic E2E tests.
-- Explicit transaction; abort if legacy rows lack ownership provenance.
BEGIN;

DO $audit$
DECLARE missing_project_count bigint;
BEGIN
 SELECT count(*) INTO missing_project_count FROM public.projects WHERE organization_id IS NULL;
 IF missing_project_count <> 0 THEN
   RAISE EXCEPTION 'Unassigned projects (%). Run ownership reconciliation first.',missing_project_count;
 END IF;
END $audit$;

-- Project-scoped entities: deterministic inheritance from their existing project.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.knowledge_base ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

UPDATE public.tasks t SET organization_id=p.organization_id FROM public.projects p
 WHERE t.project_id=p.id AND t.organization_id IS NULL;
UPDATE public.risks r SET organization_id=p.organization_id FROM public.projects p
 WHERE r.project_id=p.id AND r.organization_id IS NULL;
UPDATE public.decisions d SET organization_id=p.organization_id FROM public.projects p
 WHERE d.project_id=p.id AND d.organization_id IS NULL;
UPDATE public.knowledge_base k SET organization_id=p.organization_id FROM public.projects p
 WHERE k.project_id=p.id AND k.organization_id IS NULL;
UPDATE public.conversations c SET organization_id=p.organization_id FROM public.projects p
 WHERE c.project_id=p.id AND c.organization_id IS NULL;

-- Any row without reliable project assignment must be manually reconciled.
-- Never blanket-assign such records to Consult Services.
DO $audit$
DECLARE unassigned bigint;
BEGIN
 SELECT (
   (SELECT count(*) FROM public.tasks WHERE organization_id IS NULL)
  +(SELECT count(*) FROM public.risks WHERE organization_id IS NULL)
  +(SELECT count(*) FROM public.decisions WHERE organization_id IS NULL)
  +(SELECT count(*) FROM public.knowledge_base WHERE organization_id IS NULL)
  +(SELECT count(*) FROM public.conversations WHERE organization_id IS NULL)
 ) INTO unassigned;
 IF unassigned > 0 THEN
   RAISE EXCEPTION 'Tenant ownership ambiguous for % project-scope rows; manual reconciliation required.',unassigned;
 END IF;
END $audit$;

-- Prevent future cross-tenant references at the database layer.
CREATE UNIQUE INDEX IF NOT EXISTS projects_id_org_unique ON public.projects(id,organization_id);
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_organization_fk;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_organization_fk FOREIGN KEY (project_id,organization_id)
 REFERENCES public.projects(id,organization_id);
ALTER TABLE public.risks DROP CONSTRAINT IF EXISTS risks_project_organization_fk;
ALTER TABLE public.risks ADD CONSTRAINT risks_project_organization_fk FOREIGN KEY (project_id,organization_id)
 REFERENCES public.projects(id,organization_id);
ALTER TABLE public.decisions DROP CONSTRAINT IF EXISTS decisions_project_organization_fk;
ALTER TABLE public.decisions ADD CONSTRAINT decisions_project_organization_fk FOREIGN KEY (project_id,organization_id)
 REFERENCES public.projects(id,organization_id);
ALTER TABLE public.knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_project_organization_fk;
ALTER TABLE public.knowledge_base ADD CONSTRAINT knowledge_base_project_organization_fk FOREIGN KEY (project_id,organization_id)
 REFERENCES public.projects(id,organization_id);
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_project_organization_fk;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_project_organization_fk FOREIGN KEY (project_id,organization_id)
 REFERENCES public.projects(id,organization_id);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON public.tasks(organization_id,project_id);
CREATE INDEX IF NOT EXISTS idx_risks_tenant ON public.risks(organization_id,project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_tenant ON public.decisions(organization_id,project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant ON public.knowledge_base(organization_id,project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON public.conversations(organization_id,project_id);
-- RLS and API rollout to follow in a coordinated transaction after separate verification.
ROLLBACK; -- intentionally read/validate only until the release gate approves schema changes
