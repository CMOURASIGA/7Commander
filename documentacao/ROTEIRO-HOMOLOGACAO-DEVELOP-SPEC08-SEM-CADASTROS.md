# Roteiro de homologação 7Commander – develop – SPEC 08 e multiempresa

## Restrições
- Ambiente: **develop**, nunca main ou produção.
- **Não criar, editar, aceitar, rejeitar, vincular, desativar ou apagar dados reais.**
- Priorizar contas e organizações já existentes, navegação, consultas GET e conferência visual.
- Não acionar avaliação Jev real; não habilitar `SEVEN_COMMANDER_JEV_ENABLED`, `SEVEN_COMMANDER_JEV_COST_APPROVED` ou modo `observation` sem aprovação.
- Não alternar organização ativa se o servidor sinalizar `operationalIsolationReady:false`.
- Se algum caso só puder ser validado por gravação: registrar como **BLOQUEADO - exige dados sintéticos**. Não criar registros sem nova autorização.
- Se forem autorizados cadastros futuros: registrar previamente `organization_id`, `table`, `record_id`, usuário, horário, motivo, vínculos e dependências; criar somente em empresa QA isolada; incluir query de exclusão transacional com filtros exatos e verificação pós-exclusão. Não usar DELETE em massa nem excluir dados de usuário.
 
## Etapas de teste somente leitura
1. Anotar SHA e URL do deployment develop e garantir que seu commit é o validado, antes de clicar.
2. Login: autenticar usuários existentes e validar que a empresa ativa é apresentada. Não cadastrar novos usuários.
3. Multiempresa: conferir lista /organizations e texto de aviso de bloqueio. Inspecionar Network: GET /api/organizations/mine e GET /api/organizations/branding. Não clicar em 'Selecionar' para trocar empresa, pois isso poderia persistir estado caso as flags estejam ativas.
4. Central de Decisões: abrir /operational-decisions; conferir acesso por perfil, layout responsivo, indicadores, filtros, lista, registros existentes e mensagens de ausência. Não usar botões de avaliar, simular ou revisar. Confirmar GET /api/operational-decisions com tenant autorizado; sem autenticação, retornar 401/403.
5. Módulos: navegar projetos, Kanban, riscos, comercial, decisões, conhecimento, notificações, Kairos e Voice Room; conferir leituras coerentes com a empresa atual e ausência de dados de outra organização. Não usar formulários de edição.
6. Segurança: testar GET não autenticados quando disponíveis; negar acesso e não expor dados. Não enviar IDs de outra empresa por POST.
7. UI: desktop 1366x768, tablet 768x1024 e mobile 390x844, com capturas de tela de estados somente leitura.
8. Evidências: registrar PASS/FAIL/BLOCKED com URL, SHA, usuário/perfil sem senha, hora, request/response com identificadores e segredos ocultados, screenshots e defeitos.
9. Gate obrigatório para homologação plena: testes automatizados multiempresa com mocks, e teste isolado de duas sessões reais em ambiente QA, sem dados reais. Concorrência simultânea, auditoria pós-API, benchmark Jev e custos permanecem pendentes se não executados.

## Matriz de aprovação
- **Code ready**: typecheck, lint e build verdes no mesmo SHA.
- **UI smoke ready**: Playwright 100% verde no mesmo SHA, incluindo multiempresa.
- **Read-only homologado**: todas as telas e GET acima aprovados no mesmo deployment.
- **SPEC 08 integralmente homologada**: somente após testes de gravação autorizados, isolamento real, controle concorrente e benchmark Jev. Não confundir esses marcos.

## Registro para limpeza posterior de cadastros autorizados
| Caso | Empresa QA | Tabela | ID exato | Dependências | Responsável | Data | Exclusão autorizada? | Exclusão feita? | Conferência |
|---|---|---|---|---|---|---|---|---|---|
| Nenhum cadastro permitido nesta rodada | | | | | | | Não | Não se aplica | |

**Regra**: qualquer necessidade de criar dado deve virar impedimento no relatório. Somente a autorização seguinte poderá criar o registro com roteiro explícito de exclusão.
