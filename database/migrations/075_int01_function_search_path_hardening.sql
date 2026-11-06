-- INT-01 security hardening: pin resolution of unqualified SQL identifiers.
-- public contains both the memories table and pgvector type in this QA schema.
-- No API grants, function bodies or existing rows are changed.
ALTER FUNCTION public.match_memories(uuid, text, double precision, integer)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_profiles_updated_at()
  SET search_path = public, pg_temp;
