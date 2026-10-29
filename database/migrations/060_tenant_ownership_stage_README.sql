-- CP-MT ownership migration, staged for isolated database validation only.
-- NEVER auto-apply to production. Run with backup; coordinate RLS/API release.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.projects WHERE organization_id IS NULL)
 OR EXISTS(SELECT 1 FROM public.clients WHERE organization_id IS NULL)
 THEN RAISE EXCEPTION 'Unassigned projects or clients; reconcile ownership'; END IF;
END $$;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['tasks','risks','decisions','conversations','knowledge_base','task_boards'] LOOP
 EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id)',t);
 EXECUTE format('UPDATE public.%I c SET organization_id=p.organization_id FROM public.projects p WHERE c.project_id=p.id AND c.organization_id IS NULL',t);
 END LOOP;
END $$;
DO $$
DECLARE mapping record; remaining bigint;
BEGIN
 FOR mapping IN SELECT * FROM (VALUES
 ('messages','conversations','conversation_id'),
 ('task_columns','task_boards','board_id'),
 ('task_members','tasks','task_id'),
 ('task_labels','tasks','task_id'),
 ('task_daily_selections','tasks','task_id'),
 ('task_comments','tasks','task_id'),
 ('task_checklists','tasks','task_id'),
 ('task_checklist_items','tasks','task_id'),
 ('task_attachments','tasks','task_id'),
 ('task_activity_log','tasks','task_id'),
 ('project_members','projects','project_id'),
 ('project_invites','projects','project_id'),
 ('knowledge_chunks','knowledge_base','knowledge_id'),
 ('knowledge_embeddings','knowledge_chunks','chunk_id'),
 ('decision_status_history','decisions','decision_id')
 ) v(child_table,parent_table,parent_key) LOOP
 EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id)',mapping.child_table);
 EXECUTE format('UPDATE public.%I c SET organization_id=p.organization_id FROM public.%I p WHERE c.%I=p.id AND c.organization_id IS NULL',mapping.child_table,mapping.parent_table,mapping.parent_key);
 END LOOP;
 FOR mapping IN SELECT * FROM (VALUES
 ('tasks','projects','project_id'),('risks','projects','project_id'),
 ('decisions','projects','project_id'),('conversations','projects','project_id'),
 ('knowledge_base','projects','project_id'),('task_boards','projects','project_id'),
 ('messages','conversations','conversation_id'),
 ('task_columns','task_boards','board_id'),
 ('task_members','tasks','task_id'),('task_labels','tasks','task_id'),
 ('task_daily_selections','tasks','task_id'),('task_comments','tasks','task_id'),
 ('task_checklists','tasks','task_id'),('task_checklist_items','tasks','task_id'),
 ('task_attachments','tasks','task_id'),('task_activity_log','tasks','task_id'),
 ('project_members','projects','project_id'),('project_invites','projects','project_id'),
 ('knowledge_chunks','knowledge_base','knowledge_id'),
 ('knowledge_embeddings','knowledge_chunks','chunk_id'),
 ('decision_status_history','decisions','decision_id')
 ) v(child_table,parent_table,parent_key) LOOP
 EXECUTE format('SELECT count(*) FROM public.%I c LEFT JOIN public.%I p ON c.%I=p.id WHERE c.organization_id IS NULL OR p.organization_id IS NULL OR c.organization_id IS DISTINCT FROM p.organization_id',mapping.child_table,mapping.parent_table,mapping.parent_key) INTO remaining;
 IF remaining>0 THEN RAISE EXCEPTION 'Ambiguous or cross-tenant ownership in %: % rows',mapping.child_table,remaining; END IF;
 END LOOP;
END $$;
-- Add user-scoped records (memories/agent_runs/integrations) only after explicit ownership attribution.
-- This stage does NOT replace existing RLS or enable multi-tenant switching.
COMMIT;
