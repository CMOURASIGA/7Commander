# Gate de segurança multiempresa — bloqueios confirmados

Data: 2026-10-26. Este arquivo registra evidências e não libera deploy.

## Achado crítico RLS
As policies `tenant_member_access` em `projects`, `clients`, `tasks`, `risks`, `decisions`, `knowledge_base`, `conversations` usam `is_organization_member(user_id)`. Nesse modelo legado, `user_id` é identificador de pessoa, NÃO de organização. Portanto não representam autorização tenant correta. Não substituir às cegas; corrigir as colunas `organization_id`, identificar relações, migrar políticas com testes de usuário A/B.

## Inventário real (somente leitura)
- tasks: 9, project_id nulo: 0
- risks: 8, project_id nulo: 0
- decisions: 2, project_id nulo: 0
- knowledge_base: 1, project_id nulo: 0
- conversations: 12, project_id nulo: 0
- projects: 1, sem organization_id: 0
- clients: 1, sem organization_id: 0
- organization_members Consult Services: proprietário e Rodrigo ativos

## Gate obrigatório antes de Preview
1. Aplicar migration transacional real para as entidades com FK tenant consistente, sem ROLLBACK, somente após simulação isolada e revisão de RLS.
2. Isolar por tenant todas as consultas e ações de: tasks/cards, knowledge, decisions, risks, memories, chat/conversations/messages, planning, notificações, anexos e logs; negue acesso sem contexto ativo válido.
3. Alterar owner legacy `user_id` e Consult fixed only APÓS API tenant-aware estar pronta; nunca confundir usuários e organizações.
4. Implementar seleção persistida por usuário via `profiles.active_organization_id` validada com `organization_members` em cada requisição, revogação imediata, cache segmentado. Remover `operationalIsolationReady:false` somente após todas as validações.
5. Teste E2E com duas organizações e contas sintéticas em banco isolado; verificar bypass de endpoint por IDs, RLS, mutações cruzadas, invites/revogações e Kairos/RAG/Voice.
6. Typecheck, lint, build, E2E e security advisors aprovados. Só após isso deploy develop para homologação; main só após autorização.

## Proteções já entregues na develop
- Bloqueio da seleção operacional até implementação completa
- Validação da identidade e associação organizacional
- Escopo Consult obrigatório no frontend/backend de projetos e clientes e validação do cliente no projeto
- Rejeição de cabeçalho de outra organização nas APIs legadas
- Testes sintéticos de bloqueio da troca

AVISO: não usar estas proteções parciais para declarar multiempresa operacional. Não alterar dados reais em testes.
