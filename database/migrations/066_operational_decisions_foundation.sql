-- SPEC 08 CP-02 foundation, add-only; review before applying remotely.
CREATE TABLE IF NOT EXISTS public.operational_decision_evaluations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 module text NOT NULL CHECK(module IN ('projects','kanban','risks','commercial','decisions','knowledge','notifications')),
 entity_type text NOT NULL,
 source_id uuid,
 verdict jsonb NOT NULL DEFAULT '{}'::jsonb,
 provider text NOT NULL,
 status text NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','accepted','rejected','review_requested')),
 created_by uuid NOT NULL,
 reviewed_by uuid,
 review_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS operational_decision_eval_tenant_date ON public.operational_decision_evaluations(organization_id,created_at DESC);
ALTER TABLE public.operational_decision_evaluations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_decision_evaluations FROM anon,authenticated;
GRANT ALL ON public.operational_decision_evaluations TO service_role;
COMMENT ON TABLE public.operational_decision_evaluations IS 'SPEC08 isolated advisory evaluations; server-validated tenant and human review only';
