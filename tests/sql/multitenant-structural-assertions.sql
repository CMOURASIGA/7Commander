-- Multitenant read-only release assertions. Run after migrations 057/058
-- against an isolated Supabase test instance, NOT the production database.
DO $$
DECLARE table_name text; orphan bigint; policies bigint;
BEGIN
 FOREACH table_name IN ARRAY ARRAY[
 'projects','clients','tasks','risks','decisions','knowledge_base','conversations',
 'task_boards','task_members','task_labels','task_daily_selections','task_comments',
 'task_checklists','task_checklist_items','task_attachments','task_activity_log',
 'task_columns','project_members','project_invites','knowledge_chunks',
 'knowledge_embeddings','messages','decision_status_history'] LOOP
 EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id IS NULL',table_name) INTO orphan;
 IF orphan<>0 THEN RAISE EXCEPTION '% has % unassigned rows',table_name,orphan; END IF;
 SELECT count(*) INTO policies FROM pg_policies WHERE schemaname='public'
  AND tablename=table_name AND policyname='tenant_member_read_v2';
 IF policies<>1 THEN RAISE EXCEPTION '% missing read-only tenant RLS policy',table_name; END IF;
 END LOOP;
 IF EXISTS(
  SELECT 1 FROM pg_policies WHERE schemaname='public'
   AND (coalesce(qual,'') LIKE '%is_organization_member(user_id)%'
    OR coalesce(with_check,'') LIKE '%is_organization_member(user_id)%')
 ) THEN RAISE EXCEPTION 'Found legacy policy treating user_id as organization_id'; END IF;
END $$;
-- These are structural assertions. Still required:
-- 2 synthetic users / 2 organizations and tests for forged IDs,
-- direct PostgREST, API service-role, project cards, voice, memory and export.
