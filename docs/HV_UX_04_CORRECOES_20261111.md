# HV-UX-04 | Correções apontadas em homologação de 11/11/2026

**Projeto:** 7Commander | **Branch:** `work/local-kairos-operacional-20261111`
**Ambiente:** localhost com JWT do usuário, usando o mesmo Supabase oficial da produção
**Política:** Somente branch local. Nenhum merge develop/main, nenhuma alteração no banco nesta entrega.

## Evidências recebidas

1. Clientes Prosperitá e Mardisa: ações Editar/Remover ocupam posições diferentes conforme o tamanho da descrição.
2. Status Report: duas escolhas de público Cliente/Equipe e emissão indisponível.
3. Scrum: projeto selecionado, erro ao consultar User Stories/histórico, Sprint sem dados no seletor.
4. Whitelabel: consultas e reaplicação visual frequentes, dúvida sobre permanência da empresa selecionada.

## Correções aplicadas no código

| Item | Arquivo | Ajuste | Situação |
| ---- | ------- | ------ | -------- |
| 1 | `app/clients/page.tsx` | Ações de editar/excluir com ícones, posição alinhada por grid, descrição curta, `aria-label` e confirmação antes de excluir | Código aplicado, validação pendente |
| 2 | `app/status-report/page.tsx` | Cards visuais são fonte única de seleção de público. Seletor duplicado removido. Status da consulta visível, motivo da prévia bloqueada, botão reconsultar | Código aplicado, permissão DB pendente |
| 3 | `components/scrum/scrum-common.tsx` | Sprints e US consultadas de modo independente. Um erro em US/histórico não esconde a lista de Sprints; falhas indicadas por origem | Código aplicado, permissão DB pendente |
| 3 | `app/api/scrum/stories/route.ts` | Mensagem controlada com fonte e código do erro, sem SQL | Código aplicado |
| 4 | `components/layout/sidebar.tsx`, `components/brand/organization-brand-sync.tsx`, `components/layout/header.tsx` | Apenas o sincronizador aplica whitelabel; menu lateral consome cache validado; sem refetch ao focar janela; evento apenas quando configurações mudam | Código aplicado, teste de empresa pendente |
| 4 | `app/organizations/page.tsx` | Após POST da seleção, GET independente confirma empresa ativa antes de redirecionar, sem usar storage para autorização | Código aplicado, teste de persistência pendente |

## Diagnóstico do Supabase oficial, somente consultas SQL

As tabelas abaixo existem e possuem RLS habilitado, **mas não concedem SELECT a authenticated e não têm políticas RLS**:

- `scrum_sprints`
- `scrum_user_stories`
- `scrum_story_comments`
- `scrum_story_events`
- `scrum_backlog_items`
- `project_risk_display_codes`
- `project_report_public_facts`

Contagem somente informativa no Supabase: 2 Sprints, 5 User Stories, 9 eventos de histórico, 12 registros públicos de fatos. Não houve perda demonstrada desses dados. O principal bloqueio é incompatibilidade do acesso JWT/RLS local com tabelas originalmente usadas pelo servidor hospedado.

**CORREÇÃO ESTRUTURAL NÃO APLICADA:** `docs/sql/RLS_AUTHENTICATED_SCRUM_REPORT_REVIEW_20261111.sql` traz proposta de GRANT + RLS por empresa e projeto. Revisão de segurança obrigatória antes de execução, pois a migração amplia o acesso direto via PostgREST na base oficial, inclusive para clientes hospedados. Checar permissão de escrita, segregação empresa/projeto, viewer e auditoria, não apenas se a UI abre.

## Validações após atualizar branch

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run build`
5. `npm run dev -- --hostname localhost --port 3100`
6. `/clients`: validar alinhamento de ícones e cancelamento de exclusão.
7. `/status-report`: ver seleção única, mensagem de erro real e botão Reconsultar; exportação continua condicionada às permissões das tabelas acima.
8. `/scrum`: conferir se erros Sprints e US são independentes; desbloqueio depende da migração RLS revisada.
9. `/organizations`: selecionar uma empresa, confirmar retorno do servidor e reabrir /projects, /scrum; verificar que nome, logo e cores permanecem da empresa selecionada.
10. Revalidar perfis viewer e mudanças entre empresas (sem acesso cruzado).

## Restrições

- Não afirmar que consultas de Sprints ou emissão de relatório estão resolvidas até o banco oferecer permissões RLS corretas.
- Não usar service_role no localhost.
- Não aplicar policies permissivas genéricas ou desativar RLS.
- Não alterar `main` ou `develop` antes dos gates.
- Banco compartilhado significa que qualquer CRUD de homologação persiste nos dados produtivos.

