# HV-UX-05 | Ações agrupadas e impedimento real de consulta de Sprints

**Branch:** `work/local-kairos-operacional-20261111`
**Ambiente:** localhost autenticado (JWT + RLS) conectado à mesma base Supabase da produção
**Status:** UX implementada; liberação de Sprints exige autorização/migração RLS e homologação funcional
**Publicação:** nenhuma alteração em develop/main; nenhuma migração aplicada

## UX | Padrão obrigatório

Ações de cada registro devem ocupar **um único grupo à direita do cabeçalho**. Não colocar Editar entre título e status, ou controles espalhados pelo card.

- `app/projects/page.tsx`: título flexível à esquerda, grupo `cs-record-actions` à direita com botão Editar e seletor Status de Riscos e Decisões. Remove `Vínculos: nenhum`.
- `app/globals.css`: `.cs-record-actions`, `.cs-record-status`, desktop e responsividade.
- `app/activities/page.tsx`: ações de Kairos, Visualizar, Excluir juntas à direita, na mesma região do card.
- `app/clients/page.tsx`: Visualizar, Editar e Excluir juntos.
- `components/projects/project-stakeholders-editor.tsx`: Editar/Excluir juntos na coluna Ações.
- `app/scrum/backlog/page.tsx`: Visualizar, Editar, Excluir juntos na coluna Ações.
- `app/scrum/kanban/page.tsx`: Visualizar, Editar, Comentar juntos.
- `tests/unit/ux-icon-global.spec.ts`: regressão estática sobre o agrupamento.

Controles de status continuam com `select` devido às diversas opções, ao lado dos ícones. Botões principais Criar/Salvar/Concluir mantêm texto. Nunca mover handlers nem reduzir bloqueios de permissão.

## Scrum | Evidência do problema

Consulta **read-only** no Supabase oficial em 11/11/2026 identificou:

| Tabela | RLS | SELECT do papel authenticated | Políticas |
| --- | --- | --- | --- |
| scrum_sprints | habilitado | false | 0 |
| scrum_user_stories | habilitado | false | 0 |
| scrum_story_comments | habilitado | false | 0 |
| scrum_story_events | habilitado | false | 0 |

A Sprint **Desenvolvimento de frontend** de **Desenvolvimento de um sistema de gestão interna**, empresa **CONSULT SERVICES**, existe (06/11 a 19/11/2026, planejada). Há também a Sprint **Sprint 01 | Logs e Validação Técnica** da Mardisa-FE em **7CONSULTING** (09/11 a 13/11/2026, planejada). Portanto, dados não se perderam; a API local consulta com JWT authenticated e não pode ler essas tabelas. No ambiente publicado, a leitura usa uma configuração diferente, com permissões de servidor.

### Frontend ajustado

- `components/scrum/scrum-common.tsx` já usa `Promise.allSettled` para não descartar Sprints se somente US/histórico falhar.
- `app/scrum/page.tsx` agora mostra alerta de consulta negada, fonte da falha e botão Reconsultar. Não sugere criar nova Sprint quando a consulta está indisponível.
- `app/api/scrum/route.ts` já devolve código seguro de falha do Postgres.
- `app/api/scrum/stories/route.ts` aponta se falhou em US, comentários ou histórico.

### Bloqueio técnico para liberar a consulta

A aplicação local precisa de **GRANT + políticas RLS por empresa, projeto, usuário e papel**, nos dados Scrum. Isso expõe novas consultas à Data API do Supabase, então exige revisão de segurança contra IDOR e vazamento entre empresas, inclusive chamadas REST diretas.

A proposta anterior em `docs/sql/RLS_AUTHENTICATED_SCRUM_REPORT_REVIEW_20261111.sql` é APENAS material de análise, **não foi executada**. Não aplicar sem revisar privilégios por operação e projeto, funções auxiliares, viewer, auditoria e testes de isolamento. Não desabilitar RLS nem inserir service_role no .env.local.

## Etapas para conclusão

1. Validar TypeScript, lint, testes unitários e build do código UX.
2. Homologar visualmente o grupo de ações em Riscos, Decisões, Clientes, Backlog, Kanban e Atividades.
3. Preparar/validar políticas RLS em laboratório descartável ou staging isolado, inclusive sessão admin, editor, viewer e empresa diferente.
4. Com autorização explícita para alterar ACLs na base oficial, aplicar migração revisada e testar as APIs do localhost com JWT.
5. Revalidar leitura e CRUD de Sprints/US, histórico, Status Report e seleção de empresa. Só então classificar HV-SCRUM como PASS.

**Nota:** A correção de UX está na branch local. A correção de consulta de Sprint **não está encerrada** até o gate de banco.
