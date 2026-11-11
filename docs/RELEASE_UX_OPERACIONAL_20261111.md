# RELEASE-UX-OPERACIONAL-01 | Homologação develop

**Origem visual:** `work/local-kairos-operacional-20261111`.
**Branch de publicação selecionada:** `release/ux-operacional-develop-20261111`, criada da `develop`.

## Seleção de escopo

Este release foi reconstruído por whitelist de arquivos de UX, listagens, riscos, decisões, Scrum, Backlog, Kanban, Clientes, Projetos, Status Report e componentes visuais. Não carrega o histórico de commits do laboratório local.

**Excluído de propósito:**

- `middleware.ts`, `lib/api-auth.ts`, `lib/supabase/{server,client}.ts`, `services/project-service.ts`.
- `lib/local-write-guard.ts`, `lib/local-supabase-fetch.ts`, `lib/local-request-identity.ts`.
- `app/api/auth/local-session/route.ts`, `app/api/local-diagnostics/route.ts`, `app/local-diagnostics/page.tsx`.
- `services/kairos-core.ts` e `app/api/chat/route.ts` com adaptações locais de execução.
- Scripts `setup-local.ps1`, exemplos de credenciais e propostas SQL de revisão.

**Preservado:** configuração publicada de autenticação, middleware, service_role no servidor, integração 7Service, gates de liberação e APIs de gravação preexistentes.

## Gates obrigatórios

1. npm ci, typecheck, lint, unit e build em CI da branch de release.
2. Validar login, troca de empresa, whitelabel e consulta de Projetos/Clientes.
3. Consultar Scrum/Sprint/Backlog/Kanban e diferenciar falhas de permissão.
4. Comparar relatório Cliente e Equipe, verificar que dados internos não são expostos.
5. Testar viewer sem capacidade de gravação, URLs diretas e POST/PATCH/DELETE direto.
6. Confirmar Vercel Preview da `develop` antes de aceitar `main`.
7. Não habilitar `COMMANDER_LOCAL_AUTH_ENABLED` ou `COMMANDER_LOCAL_READ_ONLY` nos ambientes publicados.

## Supabase

Migrations de leitura dos módulos Scrum, Backlog e relatório **já haviam sido aplicadas na base compartilhada** durante homologação local. Não duplicar ou executar SQL novamente neste release. Políticas de leitura são por tenant ativo/projeto/admin; snapshot report permitiu SELECT/INSERT por admin. Testar API hospedada independentemente, porque o servidor usa service_role e não aplica automaticamente o RLS do JWT em consultas internas.

## Kairos

Prompts e Skills **já existem na develop**, não são incluídos no diff de UX. JEV adapter existente é classificação consultiva, não confirmação de banco nem prova de operação; depende de feature flag e API Gateway. Uma avaliação operacional confiável deve validar proposta, política, autorização, resultado real da persistência, IDs e auditoria. Release atual não aprova novas ações mutáveis do Kairos.

## Evidências de aceite do usuário

- UX, ícones, Clientes, Projetos e Kanban aceitos.
- Scrum/Sprint e Backlog aprovados para consulta; operações de escrita não homologadas.
- Status Report visualização aceita, PDF/registro não totalmente homologados.
- Bloqueio de aba com empresa alterada é proteção atual; isolamento por requisição é trabalho posterior.

## Critério de conclusão

Promover para develop somente com CI aprovado e sem regressão dos contratos de autorização, tenant e build. Não promover main sem autorização explícita.
