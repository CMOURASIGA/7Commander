-- INT-01 release hardening: prevent direct REST RPC EXECUTE on trigger entrypoints.
-- PostgreSQL executes existing triggers without these application-role grants.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.scrum_comment_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.scrum_story_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.scrum_task_progress() FROM PUBLIC, anon, authenticated;
COMMIT;
