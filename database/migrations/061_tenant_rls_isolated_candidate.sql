-- CP-MT RLS candidate. REQUIRES successful 060 ownership + user-scoped reconciliation.
-- Execute ONLY in an isolated clone, never directly against the active database.
-- Service-role APIs need their own explicit tenant guards; RLS cannot protect service_role.
BEGIN;
DO $$
DECLARE t text; missing bigint;
BEGIN
 FOREACH t IN ARRAY ARRAY[
 'projects','clients','tasks','risks','decisions','conversations','knowledge_base',
 'task_boards','messages','task_columns','task_members','task_labels',
 'task_daily_selections','task_comments','task_checklists','task_checklist_items',
 'task_attachments','task_activity_log','project_members','project_invites',
 'knowledge_chunks','knowledge_embeddings','decision_status_history'
 ] LOOP
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='organization_id')
 THEN RAISE EXCEPTION 'Missing tenant column: %',t; END IF;
 EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id IS NULL',t) INTO missing;
 IF missing>0 THEN RAISE EXCEPTION 'Unassigned % records in %',missing,t; END IF;
 END LOOP;
END $$;
DO $$
DECLARE t text; p record;
BEGIN
 FOREACH t IN ARRAY ARRAY[
 'projects','clients','tasks','risks','decisions','conversations','knowledge_base',
 'task_boards','messages','task_columns','task_members','task_labels',
 'task_daily_selections','task_comments','task_checklists','task_checklist_items',
 'task_attachments','task_activity_log','project_members','project_invites',
 'knowledge_chunks','knowledge_embeddings','decision_status_history'
 ] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 -- Policies are OR-combined: preserve none of the old permissive data policies.
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
 EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',p.policyname,t);
 END LOOP;
 EXECUTE format('CREATE POLICY tenant_read_authenticated ON public.%I FOR SELECT TO authenticated USING (organization_id IS NOT NULL AND public.is_organization_member(organization_id) AND organization_id = (SELECT active_organization_id FROM public.profiles WHERE user_id = (SELECT auth.uid())))',t);
 -- No INSERT/UPDATE/DELETE to authenticated roles; writes must use authorized server endpoints.
 END LOOP;
END $$;
COMMIT;
