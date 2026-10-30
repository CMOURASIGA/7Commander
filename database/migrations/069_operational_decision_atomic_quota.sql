-- SPEC08: atomic request reservation, service-only. Apply only after review.
CREATE TABLE IF NOT EXISTS public.operational_decision_quota (
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 window_start timestamptz NOT NULL,
 reservations integer NOT NULL DEFAULT 0 CHECK (reservations >= 0),
 PRIMARY KEY (organization_id,window_start)
);
ALTER TABLE public.operational_decision_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_decision_quota FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.operational_decision_quota TO service_role;
CREATE OR REPLACE FUNCTION public.reserve_operational_decision_quota(p_org uuid,p_limit integer DEFAULT 10)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE acquired integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR p_limit<1 OR p_limit>10 THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=p_org AND status='active') THEN RETURN false; END IF;
 INSERT INTO public.operational_decision_quota(organization_id,window_start,reservations)
 VALUES(p_org,date_trunc('hour',now()),1)
 ON CONFLICT(organization_id,window_start)
 DO UPDATE SET reservations=public.operational_decision_quota.reservations+1
 WHERE public.operational_decision_quota.reservations<p_limit
 RETURNING reservations INTO acquired;
 RETURN acquired IS NOT NULL;
END $fn$;
REVOKE ALL ON FUNCTION public.reserve_operational_decision_quota(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_operational_decision_quota(uuid,integer) TO service_role;
