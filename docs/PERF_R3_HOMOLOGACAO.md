# PERF-R3 | Otimização e medição do fluxo Scrum

## Alterações entregues na develop
- Escopo autorizado de Scrum (US e Backlog) reutiliza o projeto já confirmado para a identidade requisitante. O cálculo de papel permanece no servidor e verifica os mesmos vínculos; nenhuma permissão foi armazenada em cache.
- POST de atualização de Task retorna estado persistido, efeito sobre a US e tempos do processamento no cabeçalho `Server-Timing`: `auth`, `validate`, `write`, `link`, `total`.
- POST de US retorna tempos `auth`, `validate`, `write`, `total`.
- Instrumentação `?perf=1` mostra duração integral do fetch, status HTTP e Server-Timing na aba Console. Não registra tokens, query strings, corpo, nome de pessoa ou e-mail.
- A interface do PERF-R2 mantém atualização otimista e bloqueio individual por card; a mesma Task não aceita duas gravações simultâneas.

## Gates de homologação
1. **PERF-R3.1**: TO DO → DOING → TO DO. Confirmar que cada ação aparece imediatamente e que o card só fica bloqueado até o POST responder.
2. **PERF-R3.2**: mover duas Tasks independentes enquanto a primeira ainda salva; nenhum bloqueio global. Usar apenas tarefas de teste.
3. **PERF-R3.3**: concluir todas as Tasks de uma US ativa de teste. Confirmar o efeito automático da trigger na US e consistência após recarregar.
4. **PERF-R3.4**: tentar movimentação inválida e verificar resposta de erro, reversão visual e nenhuma persistência. O servidor valida as transições, independentemente do frontend.
5. **PERF-R3.5**: usuário VIEWER e usuário revogado pelo 7Service continuam proibidos de gravar, inclusive por API direta. Tenant vizinho não acessa o projeto.
6. **PERF-R3.6**: em `/scrum/kanban?perf=1`, capturar no DevTools a linha `[PERF-05]` para `POST /api/scrum/backlog-items` e os campos `elapsedMs`, `serverTiming`. Fazer 10 amostras para obter p50 e p95 em condições comparáveis.
7. **PERF-R3.7**: comparar duas passagens por Projetos, Scrum, Backlog e Status Report, distinguindo tempo até quadro renderizado do tempo de carregamento de dados.
8. **PERF-R3.8**: verificar build, typecheck, warnings, readiness e logs do preview antes de produção.

## Critérios quantitativos
Metas exploratórias: reação visual até 200 ms, confirmação de escrita p95 até 800 ms, navegação aquecida até 1 s. Não declarar estes objetivos aprovados sem amostras reais de usuários e sem contabilizar amostras com erro.
A migration PERF-04 continua preparada, não aplicada ao banco oficial. Produção permanece bloqueada até autorização explícita.
