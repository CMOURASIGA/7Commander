-- OBSOLETE / DO NOT EXECUTE. This earlier broad grant proposal is retained only
-- for audit history. It includes INSERT/UPDATE/DELETE privileges and has not
-- received the required security review or tenant access validation.
-- For the minimum owner/admin SELECT proposal refer to:
-- docs/sql/SCRUM_READ_ONLY_OWNER_RLS_REVIEW_20261111.sql
-- Never run this file on production or use it as a migration.

-- REVIEW ONLY | Commander LOCAL CRUD / authenticated role
-- DO NOT apply to the shared production Supabase without explicit database authorization,
-- regression testing, rollback and review of direct PostgREST data exposure.
-- Verified 2026-11-11: RLS enabled but authenticated has no SELECT and no RLS policy
-- for all seven tables. The hosted backend currently uses service_role, therefore
-- granting these permissions changes the external Data API surface as well.
-- Postgres RLS policies below are per-company, per-project and editor constrained.
-- They are a SECURITY PROPOSAL, not an executed or approved migration.
BEGIN;

-- scrum_sprints
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrum_sprints TO authenticated;
CREATE POLICY "ux_homolog_select" ON public.scrum_sprints FOR SELECT TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  ))));
CREATE POLICY "ux_homolog_insert" ON public.scrum_sprints FOR INSERT TO authenticated WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));
CREATE POLICY "ux_homolog_update" ON public.scrum_sprints FOR UPDATE TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member()))) WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));
CREATE POLICY "ux_homolog_delete" ON public.scrum_sprints FOR DELETE TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));

-- scrum_user_stories
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrum_user_stories TO authenticated;
CREATE POLICY "ux_homolog_select" ON public.scrum_user_stories FOR SELECT TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  ))));
CREATE POLICY "ux_homolog_insert" ON public.scrum_user_stories FOR INSERT TO authenticated WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));
CREATE POLICY "ux_homolog_update" ON public.scrum_user_stories FOR UPDATE TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member()))) WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));
CREATE POLICY "ux_homolog_delete" ON public.scrum_user_stories FOR DELETE TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));

-- scrum_backlog_items
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrum_backlog_items TO authenticated;
CREATE POLICY "ux_homolog_select" ON public.scrum_backlog_items FOR SELECT TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  ))));
CREATE POLICY "ux_homolog_insert" ON public.scrum_backlog_items FOR INSERT TO authenticated WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));
CREATE POLICY "ux_homolog_update" ON public.scrum_backlog_items FOR UPDATE TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member()))) WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));
CREATE POLICY "ux_homolog_delete" ON public.scrum_backlog_items FOR DELETE TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));

-- scrum_story_comments
GRANT SELECT, INSERT ON public.scrum_story_comments TO authenticated;
CREATE POLICY "ux_homolog_select" ON public.scrum_story_comments FOR SELECT TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  ))));
CREATE POLICY "ux_homolog_insert" ON public.scrum_story_comments FOR INSERT TO authenticated WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));

-- scrum_story_events
GRANT SELECT, INSERT ON public.scrum_story_events TO authenticated;
CREATE POLICY "ux_homolog_select" ON public.scrum_story_events FOR SELECT TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  ))));
CREATE POLICY "ux_homolog_insert" ON public.scrum_story_events FOR INSERT TO authenticated WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));

-- project_risk_display_codes
GRANT SELECT ON public.project_risk_display_codes TO authenticated;
CREATE POLICY "ux_homolog_select" ON public.project_risk_display_codes FOR SELECT TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id)));

-- project_report_public_facts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_report_public_facts TO authenticated;
CREATE POLICY "ux_homolog_select" ON public.project_report_public_facts FOR SELECT TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND ((public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) OR approved_for_client IS TRUE)));
CREATE POLICY "ux_homolog_insert" ON public.project_report_public_facts FOR INSERT TO authenticated WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));
CREATE POLICY "ux_homolog_update" ON public.project_report_public_facts FOR UPDATE TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member()))) WITH CHECK ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));
CREATE POLICY "ux_homolog_delete" ON public.project_report_public_facts FOR DELETE TO authenticated USING ((organization_id = (select active_organization_id from public.profiles where user_id = (select auth.uid()))
  AND public.is_organization_member(organization_id)
  AND EXISTS (SELECT 1 FROM public.projects project_scope WHERE project_scope.id = project_id AND project_scope.organization_id = organization_id) AND (public.is_organization_admin(organization_id) OR EXISTS (
   SELECT 1 FROM public.project_members pm
   WHERE pm.project_id=project_id AND pm.organization_id=organization_id
     AND pm.member_user_id=(select auth.uid())
     AND pm.status='active' AND pm.role IN ('owner','editor')
  )) AND NOT (select public.int01_is_central_readonly_member())));

COMMIT;
-- Validation after authorized staging deployment:
-- SELECT table_name, privilege_type FROM information_schema.role_table_grants
-- WHERE grantee='authenticated' AND table_name like 'scrum_%';
-- Run authenticated-user RLS tests for owner/editor/viewer and cross-tenant isolation.
-- Critical: test direct REST queries, not just Next.js API handlers.
