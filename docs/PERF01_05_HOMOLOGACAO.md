# PERF-01 a PERF-05 | Homologação de desempenho (develop)

**Escopo:** desenvolvimento autorizado na branch `develop`. `main` e produção não devem ser alteradas por este lote. A develop foi sincronizada com a release INT-01 existente antes das alterações.

## Entregas implementadas

- **PERF-01 Autenticação:** sincronização de dados opcionais do perfil não bloqueia a disponibilização da sessão. O servidor verifica a titularidade de um e-mail único antes de tentar atualizar o perfil. Identidades centrais distintas não são fundidas e permissões permanecem sob controle do 7Service e do Commander.
- **PERF-02 Carregamento:** busca de notificações operacionais/Scrum em paralelo, eliminando espera serial. Status Report exibe dados operacionais sem iniciar automaticamente uma análise de IA; botão **Gerar análise Kairos** solicita processamento apenas quando necessário.
- **PERF-03 Scrum/Kanban:** mudança de etapa de US ou Task aparece imediatamente, com retorno ao estado anterior quando a API reprova a transição. A política e a persistência continuam exclusivas do servidor.
- **PERF-04 Banco:** migration de índices para três chaves estrangeiras selecionadas; revisão de políticas RLS e 74 FKs apontadas pelo advisor exige EXPLAIN e validação de escala. **Não executar migration no banco oficial até a fase de publicação autorizada.**
- **PERF-05 Instrumentação:** `lib/client-performance.ts` captura a duração em milissegundos e status HTTP de requisições das telas Scrum, Projetos, Status Report e notificações. Para inspecionar eventos via DevTools, usar `?perf=1` na URL da tela. Também são geradas medidas no Performance API. Nenhum header, token, dado de resposta, ID ou query string é registrado.

## Critérios de homologação

1. Login local e login central INT-01 continuam funcionando; papel VIEWER não pode escrever. Suspensão/revogação deve ser aplicada pelo backend independentemente de qualquer cache ou estado otimista.
2. Abrir Projetos, Scrum, Backlog e Kanban e comparar timings por rota no DevTools com e sem modificações. Registrar amostras frias e aquecidas separadamente.
3. Em Scrum/Tasks, executar uma transição permitida e verificar o movimento visual imediato, persistência no reload, data de conclusão e efeito sobre a US.
4. Simular tentativa de transição proibida e verificar reversão para estado original, aviso de erro e nenhuma alteração no banco.
5. No Status Report, confirmar que a prévia de indicadores é produzida sem executar o Kairos; acionar o botão, trocar projeto/período e verificar que o resultado não é reutilizado entre contextos.
6. Confirmar os estados HTTP e tempo de resposta sem exposição de PII em logs. Comparar p50/p95 dos endpoints antes/depois usando `getClientPerformanceSummary()` do módulo no contexto de desenvolvimento/testes.
7. Conferir migração PERF-04 em transação de teste/backup antes de autorizar execução: comparar EXPLAIN, garantir não regressão em RLS e ausência de bloqueio de escrita.
8. Executar `npm run lint`, `npm run typecheck`, `npm run build`, inspeção de preview, verificação de banco e rotas de readiness.

**Pendência operacional:** o preview depende da cota de deployments Vercel. Não considerar o pacote homologado apenas pela gravação no GitHub.
