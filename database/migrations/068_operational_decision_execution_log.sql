-- SPEC 08 / CP-07 — append-only execution observability.
-- Requires 066 and 067. Do not run remotely without explicit migration approval.
CREATE TABLE IF NOT EXISTS public.operational_decision_execution_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 evaluation_id uuid REFERENCES public.operational_decision_evaluations(id),
 correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
 actor_id uuid,
 provider text NOT NULL,
 stage text NOT NULL CHECK(stage IN ('requested','completed','failed','rate_limited','rejected')),
 outcome text NOT NULL,
 latency_ms integer CHECK(latency_ms IS NULL OR latency_ms>=0),
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operational_decision_execution_tenant_date
 ON public.operational_decision_execution_log(organization_id,created_at DESC);
ALTER TABLE public.operational_decision_execution_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_decision_execution_log FROM anon,authenticated;
GRANT ALL ON public.operational_decision_execution_log TO service_role;
COMMENT ON TABLE public.operational_decision_execution_log IS 'Advisory-only SPEC08 telemetry; never store raw prompt text, credentials or model output in this table';
