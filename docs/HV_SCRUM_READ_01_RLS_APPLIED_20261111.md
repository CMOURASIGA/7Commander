# HV-SCRUM-READ-01 | Liberação restrita de consulta no Supabase oficial

**Data:** 11/11/2026
**Supabase:** `pmituaahaqimvhzhqsry` (compartilhado com produção)
**Branch código:** `work/local-kairos-operacional-20261111`
**Mudança realizada no banco:** `scrum_owner_read_tenant_rls_20261111`

## Motivo

O Commander localhost usa JWT do usuário e o papel Postgres `authenticated`. A tela Scrum apresentava `42501` porque `scrum_sprints`, `scrum_user_stories`, `scrum_story_comments` e `scrum_story_events` tinham RLS habilitado, mas **sem políticas** e **sem privilégio SELECT**.

A Sprint `Desenvolvimento de frontend` do projeto `Desenvolvimento de um sistema de gestão interna` está presente no Supabase oficial. Também existe a Sprint `Sprint 01 | Logs e Validação Técnica` em Mardisa-FE, empresa 7CONSULTING. Nenhuma delas precisava ser recriada.

## Modificação aplicada

Para as quatro tabelas Scrum acima:

- `GRANT SELECT TO authenticated`.
- Uma política `FOR SELECT TO authenticated` chamada `scrum_auth_admin_read_20261111`.
- Permite leitura somente de linhas cuja `organization_id` coincida com a empresa ativa do perfil autenticado.
- Requer `public.is_organization_admin(organization_id)` (owner/admin ativo).
- Exige projeto existente com mesmo `organization_id`.
- **Não concede INSERT, UPDATE ou DELETE.**
- **Não desativa RLS e não utiliza service_role no localhost.**

Essa política autoriza administradores da empresa ativa, não usuários viewer/member. A futura política editorial de Scrum para editores de projeto exige revisão separada.

## Evidência no banco

1. Após migração, as quatro tabelas retornam `auth_select=true` e `scoped_policy_count=1`.
2. Teste simulado usando `SET LOCAL ROLE authenticated` e JWT `request.jwt.claim.sub` do administrador da CONSULT SERVICES retornou exatamente a Sprint `Desenvolvimento de frontend` e nenhuma Sprint de outra empresa.
3. Teste simulado com usuário member ativo da CONSULT SERVICES retornou zero linhas das quatro tabelas.
4. Os testes foram executados com transação e `ROLLBACK`, sem alterar dados de negócio.

## Limites

- A migração altera a superfície de leitura da Data API do Supabase oficial, protegida pelo RLS. Revalidar o acesso em cada novo papel/empresa antes de ampliar.
- O acesso à consulta Scrum está habilitado, mas o **CRUD de Sprints e US não foi liberado** por esta migração.
- Status Report pode depender de outras tabelas sem SELECT, como `project_risk_display_codes` e `project_report_public_facts`. Essa entrega não corrige o relatório.
- Conferir a API HTTP com usuário autenticado no navegador; testes SQL não substituem homologação end-to-end.

## Homologação solicitada

1. No localhost, recarregar `/scrum` e clicar em **Reconsultar**.
2. Em empresa **CONSULT SERVICES**, projeto **Desenvolvimento de um sistema de gestão interna**, selecionar Sprint **Desenvolvimento de frontend**.
3. Verificar datas, indicadores, tarefas e navegação para Backlog e Kanban.
4. Trocar empresa para **7CONSULTING**, projeto **Mardisa-FE**, e confirmar somente a Sprint correspondente.
5. Não tentar criar novas Sprints como alternativa para consulta.
6. Enviar os erros restantes caso o frontend dependa de outras tabelas.

## Rollback controlado, somente se necessário

Após autorização específica para reverter:

```sql
DROP POLICY IF EXISTS scrum_auth_admin_read_20261111 ON public.scrum_sprints;
DROP POLICY IF EXISTS scrum_auth_admin_read_20261111 ON public.scrum_user_stories;
DROP POLICY IF EXISTS scrum_auth_admin_read_20261111 ON public.scrum_story_comments;
DROP POLICY IF EXISTS scrum_auth_admin_read_20261111 ON public.scrum_story_events;
REVOKE SELECT ON public.scrum_sprints, public.scrum_user_stories,
  public.scrum_story_comments, public.scrum_story_events FROM authenticated;
```

Verificar antes se alguma outra política passou a depender dos privilégios concedidos.

**Deploy:** nenhuma publicação em develop/main. O banco é compartilhado, logo a regra de leitura já vale independentemente de deploy.
