-- 7Commander / Multitenant. Read-only preflight; no RLS or data changes.
-- Activation is forbidden if any table appears in the result or if memories are unassigned.
WITH required(name) AS (
 VALUES ('projects'),('clients'),('tasks'),('risks'),('decisions'),('conversations'),
 ('knowledge_base'),('task_boards'),('messages'),('task_columns'),('task_members'),
 ('task_labels'),('task_daily_selections'),('task_comments'),('task_checklists'),
 ('task_checklist_items'),('task_attachments'),('task_activity_log'),
 ('project_members'),('project_invites'),('knowledge_chunks'),
 ('knowledge_embeddings'),('decision_status_history'),('memories'),
 ('agent_runs'),('integration_executions'),('integration_logs')
), inspected AS (
 SELECT r.name,
 EXISTS(SELECT 1 FROM information_schema.columns c WHERE
  c.table_schema='public' AND c.table_name=r.name AND c.column_name='organization_id') AS has_tenant,
 COALESCE(cls.relrowsecurity,false) AS rls_enabled,
 EXISTS(SELECT 1 FROM pg_policies p WHERE p.schemaname='public'
  AND p.tablename=r.name AND p.cmd='ALL' AND p.permissive='PERMISSIVE') AS legacy_all_policy
 FROM required r
 LEFT JOIN pg_class cls ON cls.oid=to_regclass(format('public.%I',r.name))
)
SELECT * FROM inspected
WHERE NOT has_tenant OR NOT rls_enabled OR legacy_all_policy
ORDER BY name;

-- Existing unassigned memories must never be exposed in a selected company.
SELECT count(*) AS memories_needing_reconciliation
FROM public.memories WHERE organization_id IS NULL;

-- Reject mixed ownership between project-scoped entities and their projects.
-- These checks are read-only and are deliberately blocking criteria.
SELECT 'tasks' AS table_name, count(*) AS mismatch FROM public.tasks t
 LEFT JOIN public.projects p ON p.id=t.project_id
 WHERE t.organization_id IS NULL OR p.id IS NULL OR t.organization_id IS DISTINCT FROM p.organization_id
UNION ALL SELECT 'risks',count(*) FROM public.risks t
 LEFT JOIN public.projects p ON p.id=t.project_id
 WHERE t.organization_id IS NULL OR p.id IS NULL OR t.organization_id IS DISTINCT FROM p.organization_id
UNION ALL SELECT 'decisions',count(*) FROM public.decisions t
 LEFT JOIN public.projects p ON p.id=t.project_id
 WHERE t.organization_id IS NULL OR p.id IS NULL OR t.organization_id IS DISTINCT FROM p.organization_id
UNION ALL SELECT 'conversations',count(*) FROM public.conversations t
 LEFT JOIN public.projects p ON p.id=t.project_id
 WHERE t.organization_id IS NULL OR p.id IS NULL OR t.organization_id IS DISTINCT FROM p.organization_id
UNION ALL SELECT 'knowledge_base',count(*) FROM public.knowledge_base t
 LEFT JOIN public.projects p ON p.id=t.project_id
 WHERE t.organization_id IS NULL OR p.id IS NULL OR t.organization_id IS DISTINCT FROM p.organization_id;
