-- 058: dependent operational entities (candidate for isolated test DB)
-- Depends on 057. This is deliberately staged; DO NOT apply on production before E2E.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='organization_id')
 THEN RAISE EXCEPTION '057 must be applied before 058'; END IF;
END $$;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['task_boards','task_members','task_labels','task_daily_selections','task_comments','task_checklists','task_checklist_items','task_attachments','task_activity_log','task_columns','project_members','project_invites','knowledge_chunks','knowledge_embeddings','messages','decision_status_history'] LOOP
 EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id)',t);
 END LOOP;
END $$;

UPDATE public.task_boards t SET organization_id=p.organization_id FROM public.projects p WHERE t.project_id=p.id AND t.organization_id IS NULL;
UPDATE public.task_members t SET organization_id=p.organization_id FROM public.projects p WHERE t.project_id=p.id AND t.organization_id IS NULL;
UPDATE public.task_labels t SET organization_id=p.organization_id FROM public.projects p WHERE t.project_id=p.id AND t.organization_id IS NULL;
UPDATE public.task_daily_selections t SET organization_id=p.organization_id FROM public.projects p WHERE t.project_id=p.id AND t.organization_id IS NULL;
UPDATE public.task_comments t SET organization_id=k.organization_id FROM public.tasks k WHERE t.task_id=k.id AND t.organization_id IS NULL;
UPDATE public.task_checklists t SET organization_id=k.organization_id FROM public.tasks k WHERE t.task_id=k.id AND t.organization_id IS NULL;
UPDATE public.task_checklist_items t SET organization_id=k.organization_id FROM public.tasks k WHERE t.task_id=k.id AND t.organization_id IS NULL;
UPDATE public.task_attachments t SET organization_id=k.organization_id FROM public.tasks k WHERE t.task_id=k.id AND t.organization_id IS NULL;
UPDATE public.task_activity_log t SET organization_id=k.organization_id FROM public.tasks k WHERE t.task_id=k.id AND t.organization_id IS NULL;
UPDATE public.task_columns t SET organization_id=b.organization_id FROM public.task_boards b WHERE t.board_id=b.id AND t.organization_id IS NULL;
UPDATE public.project_members t SET organization_id=p.organization_id FROM public.projects p WHERE t.project_id=p.id AND t.organization_id IS NULL;
UPDATE public.project_invites t SET organization_id=p.organization_id FROM public.projects p WHERE t.project_id=p.id AND t.organization_id IS NULL;
UPDATE public.knowledge_chunks t SET organization_id=k.organization_id FROM public.knowledge_base k WHERE t.knowledge_id=k.id AND t.organization_id IS NULL;
UPDATE public.knowledge_embeddings t SET organization_id=k.organization_id FROM public.knowledge_chunks k WHERE t.chunk_id=k.id AND t.organization_id IS NULL;
UPDATE public.messages t SET organization_id=c.organization_id FROM public.conversations c WHERE t.conversation_id=c.id AND t.organization_id IS NULL;
UPDATE public.decision_status_history t SET organization_id=d.organization_id FROM public.decisions d WHERE t.decision_id=d.id AND t.organization_id IS NULL;

-- Protect against incomplete provenance.
DO $$
DECLARE t text; remaining bigint;
BEGIN
 FOREACH t IN ARRAY ARRAY['task_boards','task_members','task_labels','task_daily_selections','task_comments','task_checklists','task_checklist_items','task_attachments','task_activity_log','task_columns','project_members','project_invites','knowledge_chunks','knowledge_embeddings','messages','decision_status_history'] LOOP
 EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id IS NULL',t) INTO remaining;
 IF remaining > 0 THEN RAISE EXCEPTION '%: % rows with ambiguous tenant; reconcile before migration',t,remaining; END IF;
 END LOOP;
END $$;

-- Row-level access for authenticated members only. Existing bespoke policies must
-- be inventoried and reviewed before this migration is promoted to an executable release.
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['task_boards','task_members','task_labels','task_daily_selections','task_comments','task_checklists','task_checklist_items','task_attachments','task_activity_log','task_columns','project_members','project_invites','knowledge_chunks','knowledge_embeddings','messages','decision_status_history'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('DROP POLICY IF EXISTS tenant_member_read_v2 ON public.%I',t);
 EXECUTE format('CREATE POLICY tenant_member_read_v2 ON public.%I FOR SELECT TO authenticated USING (organization_id IS NOT NULL AND public.is_organization_member(organization_id))',t);
 END LOOP;
END $$;
COMMIT;
