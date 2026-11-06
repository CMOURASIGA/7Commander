-- SPEC08 CP-02 append-only governance, not applied to remote Supabase.
CREATE TABLE IF NOT EXISTS public.operational_decision_reviews (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 evaluation_id uuid NOT NULL REFERENCES public.operational_decision_evaluations(id),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 actor_id uuid NOT NULL,
 decision text NOT NULL CHECK(decision IN ('accepted','rejected','review_requested')),
 reason text NOT NULL CHECK(length(trim(reason)) >= 5),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operational_reviews_tenant_date ON public.operational_decision_reviews(organization_id,created_at DESC);
ALTER TABLE public.operational_decision_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_decision_reviews FROM anon,authenticated;
GRANT ALL ON public.operational_decision_reviews TO service_role;
CREATE OR REPLACE FUNCTION public.log_operational_decision_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted','rejected','review_requested') THEN
   INSERT INTO public.operational_decision_reviews(evaluation_id,organization_id,actor_id,decision,reason)
   VALUES(NEW.id,NEW.organization_id,NEW.reviewed_by,NEW.status,NEW.review_reason);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS operational_decision_review_audit ON public.operational_decision_evaluations;
CREATE TRIGGER operational_decision_review_audit AFTER UPDATE OF status ON public.operational_decision_evaluations
 FOR EACH ROW EXECUTE FUNCTION public.log_operational_decision_review();
CREATE TABLE IF NOT EXISTS public.operational_decision_usage (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 provider text NOT NULL,
 model text NOT NULL,
 calls integer NOT NULL DEFAULT 0 CHECK(calls>=0),
 input_tokens bigint NOT NULL DEFAULT 0,
 estimated_cost_usd numeric(12,6) NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operational_decision_usage_tenant_date ON public.operational_decision_usage(organization_id,created_at DESC);
ALTER TABLE public.operational_decision_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_decision_usage FROM anon,authenticated;
GRANT ALL ON public.operational_decision_usage TO service_role;
