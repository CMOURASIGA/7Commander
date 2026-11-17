# HV-SCRUM-BACKLOG-REPORT-02 | Leitura da hierarquia e emissão de relatório

**Data:** 11/11/2026
**Branch de código:** `work/local-kairos-operacional-20261111`
**Supabase oficial compartilhado:** `pmituaahaqimvhzhqsry`
**Nenhum deploy em develop/main.**

## Evidência inicial

- Backlog mostrava duas User Stories, mas a rota `/api/scrum/backlog-items` retornava `Falha ao consultar hierarquia do backlog`.
- Status Report não conseguia gerar a prévia ou registrar a emissão.
- Diagnóstico read-only: `scrum_backlog_items`, `scrum_backlog_assignment_history`, `project_risk_display_codes` e `project_report_public_facts` tinham RLS ativo, **zero** políticas e **SELECT negado** ao papel `authenticated`.
- `project_report_snapshots` tinha RLS ativo, zero políticas, **SELECT/INSERT negados**.

## Mudanças efetivamente aplicadas no Supabase oficial

**Migration:** `commander_backlog_report_owner_read_20261111`

- `GRANT SELECT TO authenticated` nas quatro tabelas: `scrum_backlog_items`, `scrum_backlog_assignment_history`, `project_risk_display_codes`, `project_report_public_facts`.
- Política `commander_auth_admin_read_20261111` em cada tabela.
- Condições: empresa ativa em `profiles`, papel `owner/admin` ativo, e projeto existente vinculado à mesma empresa.
- Nenhuma permissão de escrita nessas quatro tabelas.

**Migration:** `commander_report_snapshots_owner_access_20261111`

- Em `project_report_snapshots`: `GRANT SELECT, INSERT TO authenticated`.
- Políticas `report_auth_admin_read_20261111` e `report_auth_admin_insert_20261111`.
- SELECT: mesmo escopo por tenant ativo, admin e projeto.
- INSERT: também exige `generated_by=auth.uid()`, público client/internal, período current/period e JSONs válidos em `report_data` e `narrative`.
- Sem UPDATE/DELETE. A tabela possui trigger de imutabilidade para essas operações.

## Testes executados no banco

- Quatro tabelas read-only: `auth_select=true`, exatamente uma política restritiva de leitura em cada.
- Conta de administrador da CONSULT SERVICES com JWT simulado e `SET LOCAL ROLE authenticated`: `3` itens hierárquicos autorizados no Backlog, `8` códigos de risco, `0` fatos públicos; nenhuma linha de outra empresa.
- Usuário ativo apenas como `member`: `0` linhas nas tabelas de hierarquia, códigos e snapshots.
- Consulta de todas as fontes de relatório (projetos, Sprints, US, backlog, tasks, risks, decisions, facts, códigos e snapshots) executada sem erro de privilégio.
- `INSERT` de emissão, com administrador autenticado, dentro de `BEGIN...ROLLBACK`: autorizado; checagem posterior `0` registros persistidos.
- Não foi executado INSERT/UPDATE/DELETE em itens de negócio; não houve alteração de projetos, Sprints ou US.

## Dados reais existentes no projeto de gestão interna

- `1` Epic, `1` Feature e `1` Task em `scrum_backlog_items`.
- `2` User Stories em `scrum_user_stories`.
- Nenhum fato público aprovado visível para esse tenant, portanto o Status Report Cliente pode não listar entregas editoriais aprovadas. **Não inventar fatos nem publicar dados internos automaticamente.**

## Código alterado na branch

- `app/api/scrum/backlog-items/route.ts`: quando houver novo erro, retornar fonte e código PostgreSQL controlados, sem SQL e sem dados sensíveis.
- Não foi necessário substituir a UI existente de hierarquia ou o gerador de PDF.

## Validação funcional pendente no localhost

1. Recarregar `/scrum/backlog`; verificar Epic, Feature, US e Task, expandir níveis, navegar e consultar.
2. Em `/status-report`, escolher projeto e alternar os cartões Cliente/Equipe. A prévia deve ficar disponível, com histórico e emissão após registro explícito.
3. Verificar PDF exportado em cada público e impedir exposição de dados internos no relatório Cliente.
4. Confirmar que trocar empresa remove projetos e relatórios da empresa anterior; validar um viewer sem capacidade de escrita.
5. Registrar resposta HTTP e screenshot de eventual erro restante. Não considerar PASS end-to-end até a validação visual.

## Observações de segurança

- O Supabase é compartilhado com produção, portanto as políticas já estão ativas, independentemente de deploy.
- Não adicionamos `service_role` ao localhost, nem desligamos RLS.
- GRANT não libera dados sozinho: o RLS bloqueia fora do escopo. As políticas para os dados sensíveis de escrita continuam restritas.
- A permissão de INSERT de snapshots permite que admins criem registros imutáveis de relatório. Auditar relatórios emitidos e não conceder essa permissão a viewers.
- A implementação de CRUD integral no Backlog ainda pode exigir INSERT/UPDATE/DELETE com RLS adequado; **não foi liberada** nesta etapa.
