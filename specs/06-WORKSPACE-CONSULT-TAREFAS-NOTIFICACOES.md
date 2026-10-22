# SPEC 06 — Workspace compartilhado Consult Services e avisos de tarefas

Status: IMPLEMENTAÇÃO EM VALIDAÇÃO — PRODUCTION BLOCKED.

## Decisão
A organização oficial existente `CONSULT SERVICES` (`43973606-0c05-4934-a057-9f2710899eba`) define o escopo da equipe, jamais uma liberação global de dados entre tenants. Christian é owner, Rodrigo é manager. Ambos veem os mesmos clientes e projetos da organização; contas externas não entram no escopo por mera autenticação.

## Backend implementado nesta branch
- `lib/consult-workspace.ts` valida `organization_members.status=active` antes de obter IDs da equipe e da organização.
- `services/client-service.ts`: consultas por proprietários autorizados; escrita de clientes existentes usa propriedade do registro após checagem da consulta autorizada.
- `services/project-service.ts`: projetos pertencentes a membros ativos e à organização compartilhados, incluindo os legados cujo `user_id` é o ID da organização. Acesso editorial por vínculo ativo.
- `services/task-card-detail-service.ts`: atribuição explícita de membro apenas para usuário ativo da empresa, com `member_user_id` e e-mail.
- `services/task-board-service.ts`: preenchimento de Responsável com e-mail de membro ativo associa `task_members` e possibilita notificação.
- `GET /api/my-tasks`: consulta atribuições por usuário ou e-mail e elimina tarefas concluídas. Requer JWT, sem cache.
- Componentes: sino no topo à direita e aviso central na página inicial com quantidade e lista resumida de atividades em aberto, atualizados ao entrar, ao focar janela e a cada 60 s.

## Dados / migração manual aplicada
Organização `CONSULT SERVICES` já existia. Associação idempotente aplicada à tabela `organization_members` para as duas contas autorizadas, com perfis owner/manager. Não foram apagados nem migrados clientes/projetos existentes. No diagnóstico inicial haviam 2 projetos e 7 tarefas, mas nenhum cliente e nenhum `task_members`.

## Critérios de homologação obrigatórios
1. Entrar com Christian e Rodrigo separadamente: ambos devem ver cliente/projeto criado pelo outro e as mesmas alterações.
2. Criar cliente por um usuário, editar pelo outro e recarregar ambos. Repetir com projeto.
3. Criar tarefa em projeto e atribuir por e-mail ao outro; notificações: sino, contagem, banner central e Kanban; repetir na direção inversa.
4. Concluir atividade: desaparecer da lista de pendências até a próxima atualização; testar alternância da janela e 60 s.
5. Suspender um dos usuários: perder acesso ao workspace e aos avisos imediatamente no próximo request. Testar leitor/colaborador sem escrita indevida.
6. Verificar que usuários de OUTRA organização não enxergam cliente, projeto nem tarefas.
7. Validar acesso e alterações de projetos legados com owner_id da organização; auditar endpoints não cobertos pelos services centrais.
8. Testar concorrência, responsabilidades duplicadas, redirecionamentos, navegação mobile e ausência de segredos/clientes em payloads não autorizados.
9. Atribuição por e-mail deve falhar de modo seguro para usuários inexistentes/fora da organização.
10. Build/typecheck/lint e observabilidade PASS por SHA; preservar rollback.

## Limitações
O sistema apresenta avisos in-app, não push de navegador, e consulta a cada 60 s; leitura/não lida, persistência de evento e e-mail são evolução futura. Publicar em produção somente após validar os critérios, pois o projeto usa service role nas APIs e não se deve aceitar isolamento sem testes.
