-- REVIEW ONLY: minimal Sprint read access for authenticated company OWNERS/ADMINS.
-- NOT APPLIED. This is a security-sensitive change to the shared official Supabase.
-- Does not permit create/edit/delete Sprint or User Stories.
-- Requires tenant isolation tests, viewer negative test and explicit authorization.
-- Do not bypass RLS or use service_role in localhost.
BEGIN;
GRANT SELECT ON TABLE public.scrum_sprints TO authenticated;
CREATE POLICY "scrum_auth_admin_read_20261111" ON public.scrum_sprints
  FOR SELECT TO authenticated
  USING (
    organization_id = (
          SELECT p.active_organization_id FROM public.profiles p
          WHERE p.user_id = (SELECT auth.uid())
        )
        AND public.is_organization_admin(organization_id)
        AND EXISTS (
          SELECT 1 FROM public.projects pr
          WHERE pr.id = project_id
            AND pr.organization_id = organization_id
        )
  );

GRANT SELECT ON TABLE public.scrum_user_stories TO authenticated;
CREATE POLICY "scrum_auth_admin_read_20261111" ON public.scrum_user_stories
  FOR SELECT TO authenticated
  USING (
    organization_id = (
          SELECT p.active_organization_id FROM public.profiles p
          WHERE p.user_id = (SELECT auth.uid())
        )
        AND public.is_organization_admin(organization_id)
        AND EXISTS (
          SELECT 1 FROM public.projects pr
          WHERE pr.id = project_id
            AND pr.organization_id = organization_id
        )
  );

GRANT SELECT ON TABLE public.scrum_story_comments TO authenticated;
CREATE POLICY "scrum_auth_admin_read_20261111" ON public.scrum_story_comments
  FOR SELECT TO authenticated
  USING (
    organization_id = (
          SELECT p.active_organization_id FROM public.profiles p
          WHERE p.user_id = (SELECT auth.uid())
        )
        AND public.is_organization_admin(organization_id)
        AND EXISTS (
          SELECT 1 FROM public.projects pr
          WHERE pr.id = project_id
            AND pr.organization_id = organization_id
        )
  );

GRANT SELECT ON TABLE public.scrum_story_events TO authenticated;
CREATE POLICY "scrum_auth_admin_read_20261111" ON public.scrum_story_events
  FOR SELECT TO authenticated
  USING (
    organization_id = (
          SELECT p.active_organization_id FROM public.profiles p
          WHERE p.user_id = (SELECT auth.uid())
        )
        AND public.is_organization_admin(organization_id)
        AND EXISTS (
          SELECT 1 FROM public.projects pr
          WHERE pr.id = project_id
            AND pr.organization_id = organization_id
        )
  );
COMMIT;

-- Validation expectations:
-- owner with active organization: only Scrum records from that org;
-- viewer/member without org owner/admin: 0 records;
-- owner with different active org: 0 other-tenant records;
-- unauthenticated: no access;
-- direct PostgREST requests must match Next.js API scope.
-- Do not apply to production until reviewed and approved.
