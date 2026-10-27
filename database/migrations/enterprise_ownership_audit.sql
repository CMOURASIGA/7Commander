-- Pre/post deployment review: run on development database, inspect each result.
SELECT 'missing_org' AS check_name, 'projects' AS entity, count(*) AS total FROM public.projects WHERE organization_id IS NULL
UNION ALL SELECT 'missing_org','conversations',count(*) FROM public.conversations WHERE organization_id IS NULL
UNION ALL SELECT 'missing_org','messages',count(*) FROM public.messages WHERE organization_id IS NULL
UNION ALL SELECT 'missing_org','decisions',count(*) FROM public.decisions WHERE organization_id IS NULL
UNION ALL SELECT 'missing_org','risks',count(*) FROM public.risks WHERE organization_id IS NULL
UNION ALL SELECT 'missing_org','memories',count(*) FROM public.memories WHERE organization_id IS NULL
UNION ALL SELECT 'missing_org','agent_runs',count(*) FROM public.agent_runs WHERE organization_id IS NULL
UNION ALL SELECT 'missing_org','task_boards',count(*) FROM public.task_boards WHERE organization_id IS NULL
UNION ALL SELECT 'missing_org','tasks',count(*) FROM public.tasks WHERE organization_id IS NULL;
-- Rows linked to mismatching organizations indicate corrupted ownership.
SELECT 'cross_tenant_conversations' AS check_name, count(*) AS total
FROM public.conversations c JOIN public.projects p ON p.id=c.project_id
WHERE c.organization_id IS DISTINCT FROM p.organization_id;
SELECT 'cross_tenant_messages' AS check_name, count(*) AS total
FROM public.messages m JOIN public.conversations c ON c.id=m.conversation_id
WHERE m.organization_id IS DISTINCT FROM c.organization_id;
-- Inspect RLS before replacing permissive legacy policies.
SELECT tablename,policyname,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' ORDER BY tablename,policyname;
