-- INT-01 | Limited, transactional just-in-time provisioning for centrally verified VIEWER.
-- The caller must already have verified central Auth and an active product grant
-- in the server-side broker. Never expose this routine to anon/authenticated.
BEGIN;

CREATE OR REPLACE FUNCTION public.provision_central_viewer_atomic(
  p_identity uuid,
  p_user uuid,
  p_company uuid,
  p_actor uuid,
  p_email text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing public.central_identity_user_links%ROWTYPE;
  v_member public.organization_members%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;
  IF p_identity IS NULL OR p_user IS NULL OR p_company IS NULL OR p_actor IS NULL
     OR p_email IS NULL OR length(p_email) > 254
     OR p_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  THEN RAISE EXCEPTION 'Invalid provisioning input' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = p_actor AND active = true
  ) THEN RAISE EXCEPTION 'Active approver required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user AND lower(email) = lower(p_email)
  ) THEN RAISE EXCEPTION 'Local Auth/email mismatch' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.central_client_company_links c
    JOIN public.organizations o ON o.id = c.commander_company_id
    WHERE c.commander_company_id = p_company
      AND c.status = 'ACTIVE' AND o.status = 'active'
  ) THEN RAISE EXCEPTION 'Company link required' USING ERRCODE = '23514'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = p_user AND active = true
  ) THEN RAISE EXCEPTION 'Platform admins cannot be provisioned via VIEWER JIT'
    USING ERRCODE = '42501'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.internal_user_access WHERE user_id = p_user AND active = true
  ) THEN RAISE EXCEPTION 'Internal user cannot be provisioned via VIEWER JIT'
    USING ERRCODE = '42501'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_identity::text, 0));

  SELECT * INTO v_existing FROM public.central_identity_user_links
    WHERE central_identity_id = p_identity OR commander_user_id = p_user
    LIMIT 1;
  IF FOUND THEN
    IF v_existing.central_identity_id <> p_identity
       OR v_existing.commander_user_id <> p_user
       OR v_existing.status <> 'ACTIVE'
    THEN RAISE EXCEPTION 'Conflicting or inactive identity link'
      USING ERRCODE = '23505'; END IF;
  END IF;

  SELECT * INTO v_member FROM public.organization_members
    WHERE organization_id = p_company AND user_id = p_user FOR UPDATE;
  IF FOUND THEN
    IF v_member.role <> 'member' OR v_member.status <> 'active'
    THEN RAISE EXCEPTION 'Existing membership requires manual review'
      USING ERRCODE = '23514'; END IF;
  ELSE
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
      VALUES (p_company, p_user, 'member', 'active');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user FOR UPDATE;
  IF FOUND THEN
    IF v_profile.active_organization_id IS NOT NULL
       AND v_profile.active_organization_id <> p_company
    THEN RAISE EXCEPTION 'Active organization mismatch' USING ERRCODE = '23514'; END IF;
    UPDATE public.profiles SET active_organization_id = p_company
      WHERE user_id = p_user AND active_organization_id IS NULL;
  ELSE
    INSERT INTO public.profiles (user_id, email, provider, active_organization_id)
      VALUES (p_user, lower(p_email), 'email', p_company);
  END IF;

  IF v_existing.id IS NULL THEN
    PERFORM set_config('app.int01_actor_id', p_actor::text, true);
    INSERT INTO public.central_identity_user_links
      (central_identity_id, commander_user_id, status, proof_method, approved_by, approved_at)
    VALUES (p_identity, p_user, 'ACTIVE', 'DUAL_VERIFIED_SESSION', p_actor, now());
  END IF;
  RETURN p_user;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_central_viewer_atomic(uuid,uuid,uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_central_viewer_atomic(uuid,uuid,uuid,uuid,text)
  TO service_role;

COMMIT;
