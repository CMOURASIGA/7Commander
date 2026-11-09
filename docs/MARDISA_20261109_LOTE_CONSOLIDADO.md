# 7Commander | Lote consolidado Mardisa, 09/11/2026

## Regras de publicação
- Branch develop: alterações e homologação.
- Branch main: publicar apenas após autorização explícita do responsável.
- Performance PERF-01..05, R2 e R3 permanecem em develop; a homologação funcional PERF-R3 foi aprovada, mas não liberada para produção.
- Migrações só podem ser aplicadas após validação de banco, RLS e isolamento multiempresa; nenhuma alteração ou limpeza automática dos registros históricos Mardisa.

## Inspeção do código e implementação desta rodada

| ID | Estado | Evidência no código |
|---|---|---|
| DEC-01 | Parcial implementado | `app/projects/page.tsx`: Markdown seguro, card resumido/expansível, contexto/justificativa/impacto, histórico, nomes de projeto em vez de IDs. `components/kairos/use-kairos-core.ts`: salva justificativa específica revisada em vez da resposta inteira. Conteúdo antigo não foi alterado. |
| WLB-01 | Implementado para validação | `app/api/status-report/logo/route.ts` resolve logo e empresa autenticada a partir do servidor, sem cair no logo Consult em outra empresa. `app/status-report/page.tsx` usa o resultado na prévia e HTML exportado. |
| WLB-02 | Implementado para validação | `components/layout/sidebar.tsx`, `app/organizations/page.tsx`, `components/layout/app-shell.tsx` e `components/layout/header.tsx`: marca obtida do tenant autorizado, não de sessionStorage, e outras abas invalidam contexto após alteração da empresa. |
| KAI-01 | Parcial implementado | `components/kairos/use-kairos-core.ts` filtra seções gerenciais, exige ações concretas e detecta títulos duplicados no quadro antes de criar Tasks; seleção manual continua obrigatória. Revalidar com relatório original. |
| KAI-02 | Pendente | Registro estruturado e persistente de reuniões ainda requer modelagem, API, autorização e migração. |
| KAI-03 | Pendente | Encaminhamento guiado para US, Sprint, Tasks de US e demais destinos exige expansão do diálogo e controle transacional de duplicações. |
| SCR-01 | Parcial implementado | `app/scrum/backlog/page.tsx` expõe seleção de responsável para Epic/Feature. Backend já persiste `responsible` e valida vínculo; histórico de reatribuição ainda precisa de mecanismo de auditoria. |
| SCR-02 | Parcial existente | Hierarquia Epic→Feature→US→Task e vínculo de Sprint existem. Falta origem Kairos e tratamento transacional de duplicatas. |
| SCR-03 | Existente, revisão necessária | Backlog já recalcula início, dias corridos e prazo. Validar consistência entre campos e data de conclusão. |
| NOT-01 | Parcial implementado | Notificações Scrum já abrem US pelo link. Notificações operacionais agora usam `/activities?projectId=...&taskId=...`; a tela valida presença no quadro autorizado antes de abrir o detalhe. Backlog aceita `itemId` para futuro destino Epic/Feature. |
| NOT-02 | Pendente | Agrupamento, detalhes de evento e estados de leitura seguem por avaliar. |
| KAI-04 | Pendente | Comparação entre reuniões requer KAI-02 e fatos registrados. |
| KAI-05 | Pendente | Timeline gerencial cruzando encontros, decisões, riscos, US e Tasks necessita relações de origem auditáveis. |

## Gates obrigatórios
1. Verificar `npm run typecheck`, `npm run lint`, `npm run build`, testes de regressão, health/ready.
2. Homologar decisão Mardisa | Entrega das tabelas de log de ETL | 09/11/2026: texto antigo acessível, Markdown legível, registro sem identificação técnica visível, histórico preservado.
3. Verificar que novo direcionamento do Kairos não persiste Status Report inteiro na justificativa nem sugere seis seções como tarefas.
4. Alternar Consult Services e 7Consulting em duas abas e confirmar logo, nome, cor e isolamento de dados; o servidor deve rejeitar troca não autorizada.
5. Emitir Status Report Executivo de ambas as empresas: conferir marca e nome na prévia e no HTML exportado, sem fallback Consult em 7Consulting.
6. Validar responsáveis independentes de Epic e Feature e operações com usuário VIEWER.
7. Testar acesso direto da notificação de Task e US; impedir abrir projeto/atividade sem vínculo.
8. Verificar processo de publicação consolidada somente após todas as histórias aprovadas e autorização para main.

## Bloqueios
- Limite diário de deployments da Vercel retornou HTTP 402. Não há build validado do conjunto nesta rodada.
- As funcionalidades dependentes de nova estrutura de reuniões e vínculos não estão concluídas. Não classificar o pacote total como pronto para homologação/produção.
