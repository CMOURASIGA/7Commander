# SPEC — Atividades multicontexto e Minhas pendências (lote futuro)

Status: IMPLEMENTAÇÃO PARCIAL / PROTÓTIPO OPERACIONAL SINTÉTICO. Não homologado para produção.

## Regras funcionais
- O Kanban continua organizado por um único contexto escolhido: projeto, prospect, oportunidade ou internas.
- O filtro inicial é **Todas**: contém todas as atividades acessíveis daquele contexto, inclusive delegadas a outras pessoas.
- **Minhas** filtra o responsável pela execução, **Delegadas** combina criador=usuário e responsável!=usuário, **Criadas por mim** usa autoria independentemente do responsável.
- **Minhas pendências** agrega tarefas atribuídas ao usuário ainda não concluídas de todos os contextos autorizados, sem alterar o acesso aos quadros originais.
- A conclusão retira a tarefa das pendências sem apagar o histórico do contexto de origem.
- Na produção, autoria deve ser vinculada a UUID do usuário; responsável também por UUID de membro ativo. Não usar nomes livres para autorização.
- Somente usuário com acesso ao contexto pode consultar/alterar registros, e ações de escrita devem passar por verificação RBAC/RLS.
- Alertas: atraso, hoje, até 3 dias; respeitar timezone America/Sao_Paulo e data civil.

## Entrega A (já codificada na branch)
Página `/activities/overview` em modo mock local e acessível por link de `/activities`; cria, move e lista atividades sintéticas por contexto, inclusive delegadas/criadas e pendências. Persistência local somente no navegador. Não usa API ou Supabase.

## Entrega B (a implementar antes de homologar a operação real)
1. Modelar vínculo ao contexto com `organization_id` e `context_kind/context_id` em estrutura multi-tenant própria ou extensão segura do Task Core. O projeto não pode ser exigido para uma atividade de prospect.
2. FKs/checks/índices para integridade da origem, autor e responsável; evitar referências polimórficas sem validação. Preservar as tarefas atuais de projeto.
3. API com CRUD e idempotência, filtros paginados (contexto, autor, responsável, status, período), dashboard e auditoria. Isolar pela organização.
4. Vincular registros de planejamento aos prospects e oportunidades, respeitar as permissões de planejamento e o acesso a projetos.
5. Conectar o Kanban novo e Minhas pendências às APIs, sem depender de localStorage, com erros e rollback explícitos.
6. Criar testes unitários, integração RLS e E2E operacional com mocks/banco isolado; não reutilizar credenciais de produção.
7. Revisar política de deploy: acumular ao menos 6 entregas testadas antes de promover develop/main.

## Restrições
Nenhuma migration aplicada na produção por esta branch. Nenhum dado comercial ou projeto real é acessado pelo protótipo mock.
