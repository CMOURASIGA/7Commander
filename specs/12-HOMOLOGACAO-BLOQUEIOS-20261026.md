# 7Commander — bloqueios homologação 26/10/2026

Status: FAIL/BLOQUEADO. Registrar no lote de correções. Não promover develop ou publicar sem gate.

## Evidências validador
- /projects: carga 2,6 s incluindo sessão; troca QA 23 ms; gerenciar 278 ms.
- Edição simples projeto: 'Salvando...' ~10,3 s, persiste após reload.
- Kairos sete riscos: retorna completo em 35–40 s, latência crítica.
- Kanban: criar atividade >10 s; UI 0 cards sem erro; atribuição/sino/conclusão bloqueados.

## Confirmação read-only Supabase
- Projeto QA `ab51b994-0f59-4174-9d6d-d98c00d41987` ativo.
- Tarefa `6d9791c5-d85d-4356-ae62-0b52a6928487`, título 'QA Kanban - persistência e notificações', gravada às 13:05:42Z, com board_id=NULL, column_id=NULL.
- Quadro do projeto `d312d84f-0b79-47c3-9d8b-7e9aad02ed1d` existe.
- NÃO apagar a tarefa sem reconciliar; preservá-la como evidência.

## Hipótese forte sustentada por código
`services/task-board-service.ts`: `createTaskCard` pode executar `createTaskCardLegacy` se houver falha de schema em `task_columns` / `tasks`. Esse fallback insere tarefa sem board_id/column_id. `listTaskBoard` quando encontra quadro usa filtro `.eq('board_id', board.id)`, ocultando o registro legado. A POST pode retornar sucesso enquanto a recarga do quadro mostra zero cards. Confirmar com logs e esquema antes de corrigir. Não deixar fallback gerar tarefa invisível. Implementar reconciliação transacional/idempotente de legado, migrar com auditoria.

## Ações
1. Analisar migration 053 (source_ref) instalada ou pendente e compatibilidade do schema tasks; verificar erros de coluna nos logs.
2. Corrigir fallback: não gravar registro órfão invisível, retornar erro legível e correlação; reprocessar registro QA sem duplicá-lo.
3. Otimizar PATCH/POST projeto e fetch subsequente: tempos separados (API vs refetch), atualizar UI otimisticamente ou invalidar em segundo plano; evitar request em cascata, com logs de tempo.
4. Kairos: instrumentar primeiro token, execução total e erros; timeout controlado, feedback e preservação da sessão; sem duplicar solicitações.
5. Testes E2E: POST card -> visível -> reload -> edição -> atribuição -> sino -> conclusão; upgrade legado e idempotência; 7 riscos; projeto PATCH; cenários erros.
6. Manter branch isolada, sem deploy, aguardar gate mínimo de seis entregas testadas.

## Critério
Card criado deve aparecer no quadro na mesma execução e após reload; se a gravação não puder resultar em card visível, reportar erro e não persistir órfão. Projeto deve ter medição objetiva das parcelas da latência. Kairos com resposta/falha explícita e sem travar a sessão.
