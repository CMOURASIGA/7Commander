-- INT-01 SECURITY: prevent central VIEWER/member from bypassing API write denials
-- with direct authenticated Supabase Data API calls.
-- Does not modify business records, grants, memberships or passwords.
BEGIN;

CREATE OR REPLACE FUNCTION public.int01_is_central_readonly_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.central_identity_user_links l
    JOIN public.organization_members m
      ON m.user_id = l.commander_user_id
    WHERE l.commander_user_id = (SELECT auth.uid())
      AND l.status = 'ACTIVE'
      AND m.status = 'active'
      AND m.role = 'member'
  );
$$;
REVOKE ALL ON FUNCTION public.int01_is_central_readonly_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.int01_is_central_readonly_member() TO authenticated;

-- All pre-existing permissive read policies stay untouched. Restrictive
-- write policies are AND-ed with every permissive policy.
DO $guard$
DECLARE
  item record;
  table_count integer := 0;
BEGIN
  FOR item IN
    SELECT DISTINCT tablename
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'ALL'
      AND policyname IN ('tenant_active_member_all', 'tenant_member_access')
      AND tablename = ANY(ARRAY[
        'agent_runs','conversations','decision_status_history','decisions',
        'integration_executions','integration_logs','kairos_profiles',
        'knowledge_base','knowledge_chunks','knowledge_embeddings',
        'memories','messages','project_invites','project_members','risks',
        'task_activity_log','task_attachments','task_boards','task_checklist_items',
        'task_checklists','task_columns','task_comments','task_daily_selections',
        'task_labels'
      ])
  LOOP
    table_count := table_count + 1;
    EXECUTE format('DROP POLICY IF EXISTS int01_viewer_no_insert ON public.%I', item.tablename);
    EXECUTE format('DROP POLICY IF EXISTS int01_viewer_no_update ON public.%I', item.tablename);
    EXECUTE format('DROP POLICY IF EXISTS int01_viewer_no_delete ON public.%I', item.tablename);
    EXECUTE format(
      'CREATE POLICY int01_viewer_no_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT public.int01_is_central_readonly_member()))',
      item.tablename);
    EXECUTE format(
      'CREATE POLICY int01_viewer_no_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT (SELECT public.int01_is_central_readonly_member())) WITH CHECK (NOT (SELECT public.int01_is_central_readonly_member()))',
      item.tablename);
    EXECUTE format(
      'CREATE POLICY int01_viewer_no_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT (SELECT public.int01_is_central_readonly_member()))',
      item.tablename);
  END LOOP;

  IF table_count <> 24 THEN
    RAISE EXCEPTION 'INT01 RLS guard requires 24 known tenant tables, found %', table_count;
  END IF;
END
$guard$;

COMMIT;
