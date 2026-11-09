# Homologação consolidada 7Commander | Mardisa + PERF
Data de referência: 09/11/2026
Branch: develop. Produção main permanece bloqueada até autorização explícita.

## Estado de engenharia
- PERF-01..05 + R2 + R3: homologação funcional do usuário aprovada. A migration PERF-04 ainda não foi aplicada.
- DEC-01: Markdown em Decisões, resumo expandível, relatório antigo separado da decisão sem apagar conteúdo original; Kairos exige texto de decisão específico.
- WLB-01/02: Status Report com logo do tenant ativo; sidebar e cabeçalho atualizam empresa entre abas; invalidação de contexto quando a empresa ativa mudar.
- KAI-01: extrator de ações ignora títulos gerenciais e considera bullets executáveis, com revisão manual; evita títulos já existentes.
- KAI-02: cadastro de reuniões via Kairos e página do projeto; tabelas e API autorizada preparadas em migration.
- KAI-03/SCR-02: Kairos pode registrar US independente ou ligada à Feature e Sprint existentes, criar Task subordinada à US, além dos destinos já existentes (decisão, risco, conhecimento, Kanban operacional). Verificações de duplicidade do Kairos também no servidor; nenhuma Sprint/Task paralela criada.
- SCR-01: responsáveis independentes de Epic/Feature, filtro por responsável, histórico de reatribuição em migration + drawer.
- SCR-03: validação de coerência início/prazo/entrega no servidor.
- NOT-01: deep links para US, Tasks operacionais e itens do Backlog, sempre com escopo validado na API.
- NOT-02: identificação de tipo/data/estado de leitura onde a origem disponibiliza esses campos; evita exibição repetida do mesmo identificador.
- KAI-04/KAI-05: comparação factual entre duas reuniões e timeline com vínculos reais a US, Sprints e Tasks; nenhum compromisso é presumido como concluído.

## Migrations pendentes em QA
- `supabase/migrations/20261109011000_perf04_targeted_indexes.sql`
- `supabase/migrations/20261109144000_kai02_project_meetings.sql`
- `supabase/migrations/20261109152000_scr01_assignment_history.sql`

**Não aplicar diretamente no banco oficial antes de aprovar o ambiente-alvo.**
As novas tabelas têm RLS habilitado, sem DML para `anon`/`authenticated`; APIs exigem autorização e cruzam organização + projeto.

## Gate técnico ainda não concluído
- Executar lint, typecheck, build e e2e do HEAD da develop. As versões publicadas anteriormente não incluem o pacote atual.
- A Vercel retornou HTTP 402 por limite diário de deployments. Não há preview READY do novo HEAD.
- O Supabase ativo é o banco oficial do Commander. O laboratório descartável INT-01 está inativo; não usá-lo como QA deste pacote sem recriar ambiente de testes isolado.

## Roteiro de homologação
1. Mardisa-FE > Decisões: abrir o registro antigo "Entrega das tabelas de log de ETL | 09/11/2026"; confirmar Markdown, conteúdo específico e relatório integral em seção de auditoria.
2. Kairos > Direcionar resposta: gerar Decisão, Risco, Conhecimento, Reunião, US e Task de US em projeto de teste. Nunca salvar um relatório inteiro como decisão.
3. Processar o relatório semanal Mardisa; não criar seis Tasks chamadas Avanços, Pendências, Compromissos, Riscos, Próximos Passos e Situação Geral.
4. Reuniões: registrar histórico, comparar duas datas, vincular registros existentes e verificar que não há cópias/IDs técnicos visíveis.
5. Epic e Feature: responsáveis distintos, editar, filtrar, verificar registro do histórico.
6. US: criar via Kairos vinculada a Feature/Sprint; garantir a regra de datas, ações de Sprint encerrada e prevenção de duplicatas.
7. Task da US: confirmar vínculo, Kanban, transição, regras de trigger de US e persistência.
8. Notificações de US e Task: clicar, chegar ao registro exato e atualizar página sem perder contexto.
9. Whitelabel: operar em 7Consulting e Consult Services em duas abas; validar logo/nome/cores e isolamento; confirmar ambas as exportações do Status Report.
10. Segurança: usuário VIEWER, identidade suspensa via 7Service, sem sessão e outra empresa não podem gravar; confirmar códigos HTTP das APIs e que o cache não contorna a revogação.
11. Performance: repetir os testes aprovados de PERF-R3; confirmar que o novo pacote não causa regressão de latência e que o Server-Timing não expõe informações sensíveis.
12. Integridade: migration em QA, EXPLAIN de índices, políticas RLS, logs, backups e ausência de erros no runtime.

## Condição de liberação
Somente com gates técnicos PASS + migrações QA + homologação funcional/regressão + autorização explícita do responsável. Não publicar na main antes disso.
