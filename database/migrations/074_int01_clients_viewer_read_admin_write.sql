-- INT-01 QA security: VIEWER may read tenant clients but never mutate them.
-- Align clients RLS with the already admin-gated projects/tasks model.
-- No production migration is implied by this develop QA change.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_active_member_all ON public.clients;

CREATE POLICY int01_clients_member_read ON public.clients
 FOR SELECT TO authenticated
 USING (
   organization_id IS NOT NULL
   AND public.is_organization_member(organization_id)
   AND organization_id = (
     SELECT active_organization_id FROM public.profiles
     WHERE user_id = (SELECT auth.uid())
   )
 );

CREATE POLICY int01_clients_admin_insert ON public.clients
 FOR INSERT TO authenticated
 WITH CHECK (
   organization_id IS NOT NULL
   AND public.is_organization_admin(organization_id)
   AND organization_id = (
     SELECT active_organization_id FROM public.profiles
     WHERE user_id = (SELECT auth.uid())
   )
 );

CREATE POLICY int01_clients_admin_update ON public.clients
 FOR UPDATE TO authenticated
 USING (
   organization_id IS NOT NULL
   AND public.is_organization_admin(organization_id)
   AND organization_id = (
     SELECT active_organization_id FROM public.profiles
     WHERE user_id = (SELECT auth.uid())
   )
 )
 WITH CHECK (
   organization_id IS NOT NULL
   AND public.is_organization_admin(organization_id)
   AND organization_id = (
     SELECT active_organization_id FROM public.profiles
     WHERE user_id = (SELECT auth.uid())
   )
 );

CREATE POLICY int01_clients_admin_delete ON public.clients
 FOR DELETE TO authenticated
 USING (
   organization_id IS NOT NULL
   AND public.is_organization_admin(organization_id)
   AND organization_id = (
     SELECT active_organization_id FROM public.profiles
     WHERE user_id = (SELECT auth.uid())
   )
 );
