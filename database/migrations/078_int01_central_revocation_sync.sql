-- INT01 revocation sync is server-only; a suspended central entitlement cannot
-- retain direct PostgREST access through the previously valid local JWT.
BEGIN;
CREATE TABLE IF NOT EXISTS public.central_revocation_suspensions (
  commander_user_id uuid NOT NULL REFERENCES auth.users(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  suspended_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (commander_user_id, organization_id)
);
ALTER TABLE public.central_revocation_suspensions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.central_revocation_suspensions FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.int01_sync_central_membership(
  p_user uuid, p_company uuid, p_authorized boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog, public
AS $$
DECLARE v_status text; v_role text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.central_identity_user_links l
    WHERE l.commander_user_id=p_user AND l.status='ACTIVE'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.central_client_company_links c
    WHERE c.commander_company_id=p_company AND c.status='ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Central links required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||p_company::text,0));
  SELECT status,role INTO v_status,v_role FROM public.organization_members
    WHERE user_id=p_user AND organization_id=p_company FOR UPDATE;
  -- Central VIEWER synchronization can never suspend or reactivate an elevated local role.
  IF v_role IS DISTINCT FROM 'member' THEN RETURN false; END IF;
  IF p_authorized THEN
    -- Only undo a suspension recorded by this integration, never a manual block.
    IF v_status='suspended' AND EXISTS (
      SELECT 1 FROM public.central_revocation_suspensions
      WHERE commander_user_id=p_user AND organization_id=p_company
    ) THEN
      UPDATE public.organization_members SET status='active'
      WHERE user_id=p_user AND organization_id=p_company AND status='suspended';
      DELETE FROM public.central_revocation_suspensions
      WHERE commander_user_id=p_user AND organization_id=p_company;
      RETURN true;
    END IF;
    RETURN v_status='active';
  END IF;
  IF v_status='active' THEN
    INSERT INTO public.central_revocation_suspensions(commander_user_id,organization_id)
      VALUES(p_user,p_company) ON CONFLICT DO NOTHING;
    UPDATE public.organization_members SET status='suspended'
      WHERE user_id=p_user AND organization_id=p_company AND status='active';
  END IF;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.int01_sync_central_membership(uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.int01_sync_central_membership(uuid,uuid,boolean) TO service_role;
COMMIT;