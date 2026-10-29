-- Isolamento multempresa: aceite estrutural, somente leitura.
-- Executar na cópia de homologação depois das migrações; nenhum DDL/DML aqui.
WITH expected(table_name) AS (
 VALUES ('projects'),('clients'),('tasks'),('risks'),('decisions'),('conversations'),
 ('knowledge_base'),('task_boards'),('messages'),('task_columns'),('task_members'),
 ('task_labels'),('task_daily_selections'),('task_comments'),('task_checklists'),
 ('task_checklist_items'),('task_attachments'),('task_activity_log'),
 ('project_members'),('project_invites'),('knowledge_chunks'),
 ('knowledge_embeddings'),('decision_status_history'),('memories'),
 ('agent_runs'),('integration_executions'),('integration_logs')
)
SELECT e.table_name,
 EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=e.table_name AND c.column_name='organization_id') AS coluna_empresa,
 EXISTS(SELECT 1 FROM pg_tables t WHERE t.schemaname='public' AND t.tablename=e.table_name AND t.rowsecurity) AS rls_ativado
FROM expected e ORDER BY e.table_name;

-- Detecta políticas permissivas prévias não removidas.
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public'
AND tablename IN ('projects','clients','tasks','risks','decisions','conversations','messages','memories','agent_runs','integration_executions','integration_logs')
ORDER BY tablename,policyname;

-- Verificação nominal da empresa ativa (não modifica perfil).
SELECT o.name,COUNT(m.user_id) FILTER(WHERE m.status='active') AS membros_ativos
FROM public.organizations o LEFT JOIN public.organization_members m ON m.organization_id=o.id
GROUP BY o.id,o.name ORDER BY o.name;

-- Ainda obrigatório: teste de API autenticada usando dois usuários/organizações diferentes
-- e tentativas de GET, POST, PATCH e DELETE em dados cruzados.
