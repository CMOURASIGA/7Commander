-- 059: tenant assignment for user-origin records with no project relation.
-- CANDIDATE ONLY. Requires local isolated DB execution and review.
-- A single user may belong to many companies: never infer tenant in that case.
BEGIN;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['memories','agent_runs','integration_executions','integration_logs'] LOOP
 EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id)',t);
 END LOOP;
END $$;
CREATE TEMP TABLE _unique_tenant_members ON COMMIT DROP AS
 SELECT user_id, min(organization_id) AS organization_id
 FROM public.organization_members
 WHERE status='active'
 GROUP BY user_id
 HAVING count(DISTINCT organization_id)=1;

UPDATE public.memories t SET organization_id=m.organization_id FROM _unique_tenant_members m
 WHERE t.user_id=m.user_id AND t.organization_id IS NULL;
UPDATE public.agent_runs t SET organization_id=m.organization_id FROM _unique_tenant_members m
 WHERE t.user_id=m.user_id AND t.organization_id IS NULL;
UPDATE public.integration_executions t SET organization_id=m.organization_id FROM _unique_tenant_members m
 WHERE t.user_id=m.user_id AND t.organization_id IS NULL;
UPDATE public.integration_logs t SET organization_id=m.organization_id FROM _unique_tenant_members m
 WHERE t.user_id=m.user_id AND t.organization_id IS NULL;

DO $$
DECLARE t text; n bigint;
BEGIN
 FOREACH t IN ARRAY ARRAY['memories','agent_runs','integration_executions','integration_logs'] LOOP
 EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id IS NULL',t) INTO n;
 IF n>0 THEN RAISE EXCEPTION 'Ambiguous tenant for % row(s) in %; manual review needed',n,t; END IF;
 END LOOP;
END $$;

-- The old kairos_profiles primary key is user_id only. Instead of altering it
-- destructively create separate per-organization records.
CREATE TABLE IF NOT EXISTS public.kairos_organization_profiles (
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 instructions text,
 knowledge text,
 icebreakers jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,user_id)
);
INSERT INTO public.kairos_organization_profiles(organization_id,user_id,instructions,knowledge,icebreakers,updated_at)
 SELECT m.organization_id,p.user_id,p.instructions,p.knowledge,to_jsonb(p.icebreakers),p.updated_at
 FROM public.kairos_profiles p JOIN _unique_tenant_members m ON m.user_id=p.user_id
 ON CONFLICT (organization_id,user_id) DO NOTHING;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.kairos_profiles p LEFT JOIN _unique_tenant_members m ON m.user_id=p.user_id WHERE m.user_id IS NULL)
 THEN RAISE EXCEPTION 'User-scoped Kairos profiles without unambiguous tenant'; END IF;
END $$;
ALTER TABLE public.kairos_organization_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kairos_organization_profile_owner ON public.kairos_organization_profiles;
CREATE POLICY kairos_organization_profile_owner ON public.kairos_organization_profiles
 FOR ALL TO authenticated
 USING (user_id=(select auth.uid()) AND public.is_organization_member(organization_id))
 WITH CHECK (user_id=(select auth.uid()) AND public.is_organization_member(organization_id));

DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['memories','agent_runs','integration_executions','integration_logs'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('DROP POLICY IF EXISTS tenant_owner_read_v2 ON public.%I',t);
 EXECUTE format('CREATE POLICY tenant_owner_read_v2 ON public.%I FOR SELECT TO authenticated USING (user_id=(select auth.uid()) AND public.is_organization_member(organization_id))',t);
 END LOOP;
END $$;
COMMIT;
