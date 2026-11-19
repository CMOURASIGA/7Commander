-- HV-02: prevent the Scrum policy from accepting a foreign project.
-- Additive authorization tightening for the existing Commander database.
-- APPLY ONLY AFTER a verified database backup and an authorized maintenance window.
-- Does not create another Supabase project or change application data.
BEGIN;
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='scrum_backlog_items'
      AND policyname='commander_auth_admin_read_20261111'
      AND cmd='SELECT'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='scrum_user_stories'
      AND policyname='scrum_auth_admin_read_20261111'
      AND cmd='SELECT'
  ) THEN
    RAISE EXCEPTION 'HV-02: expected Scrum RLS policies are missing; abort';
  END IF;
END
$guard$;

ALTER POLICY commander_auth_admin_read_20261111
ON public.scrum_backlog_items
USING (
  organization_id IS NOT NULL
  AND organization_id = (
    SELECT p.active_organization_id FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid())
  )
  AND public.is_organization_admin(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.projects pr
    WHERE pr.id = scrum_backlog_items.project_id
      AND pr.organization_id = scrum_backlog_items.organization_id
  )
);

ALTER POLICY scrum_auth_admin_read_20261111
ON public.scrum_user_stories
USING (
  organization_id IS NOT NULL
  AND organization_id = (
    SELECT p.active_organization_id FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid())
  )
  AND public.is_organization_admin(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.projects pr
    WHERE pr.id = scrum_user_stories.project_id
      AND pr.organization_id = scrum_user_stories.organization_id
  )
);
COMMIT;
