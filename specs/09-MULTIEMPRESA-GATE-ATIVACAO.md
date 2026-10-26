# Multiempresa — Gate de ativação

Data-base da auditoria: 26/10/2026. A tela /organizations e /api/organizations/mine não habilitam isolamento. A seleção ainda é demonstrativa. **Não cadastrar uma segunda empresa com dados reais até o gate passar.**

## Inventário observado
Tabelas com organization_id: organizations, organization_members, organization_invites, organization_modules, platform_audit_log, commander_planning_records, commander_analysis_runs, commander_coverage_matrix, commander_research_usage, projects, clients.
Tabelas com dados dependentes de projeto, mas sem organization_id direto: tasks, task_boards, task_labels, task_members, task_daily_selections, risks, decisions, knowledge_base, knowledge_chunks, knowledge_embeddings, project_members, project_invites, conversations.
Tabelas sem organização direta e com contexto que precisa ser redesenhado: messages, memories, agent_runs, kairos_profiles, integration_executions, integration_logs, decision_status_history.
A tabela internal_user_access possui papéis globais legados. Não usá-la isoladamente para autorizar ações em outra empresa.

## Bloqueios de segurança
1. Substituir getConsultMemberIds, consultMemberRole, resolveConsultAssignee e constantes hard-coded nos serviços por funções recebendo tenant explícito e validado. Os serviços existentes que consultam por user_id compartilhado não podem funcionar com segunda empresa antes disso.
2. Aplicar context em todas as rotas REST, consultas no Supabase, armazenamento, histórico, notificações, Kairos, RAG, Voice Room e status report, inclusive na autenticação e na navegação.
3. Definir políticas RLS por tenant e RBAC, sem ampliar SELECT para apenas authenticated, e proteger relações cross-tenant por integridade no banco.
4. Gerar scripts não destrutivos de backfill, apresentar tabela de registros ambíguos, validar owners históricos e auditar contagens antes de tornar colunas obrigatórias.
5. Criar testes de isolamento com usuários sintéticos A/B, cobrindo API, RLS, objetos por ID arbitrário, buscas, memória, relatório, eventos e troca de empresa.
6. Garantir build/testes e só publicar develop quando houver seis entregas homologáveis e autorização para o deploy de validação; main após a homologação.

## Implementado até agora
- Migração 055 proposta sem executar na produção; organização Consult Services e dois usuários já verificados.
- GET /api/organizations/mine, tela de escolha preparatória, contexto identificável no cabeçalho, lib/tenant-context.ts (verificador de membership).
- **Não conectar seleção do cliente a consultas legacy antes do gate.**

## Critério de aceite
Nenhum recurso da organização B deve retornar conteúdo ou ser alterado quando a requisição usa sessão de A. O frontend pode falhar/ficar vazio, mas não pode recuperar dados de outra empresa por fallback. A revogação de membership deve bloquear acesso imediatamente no servidor.
