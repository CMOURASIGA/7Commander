# Regra de publicação e desempenho — 7Commander

## Gate de deploy (22/10/2026)
- **Não publicar a cada commit/correção.** Acumular **mais de cinco ações de correção concluídas (mínimo seis)** antes de solicitar novo deployment para Preview ou produção.
- Exceção: hotfix crítico de segurança, indisponibilidade, perda de dados ou correção rápida explicitamente necessária e validada. Documentar o motivo e impacto.
- Mudanças de código podem receber commits e verificações estáticas sem disparar deployment manual; evitar pushes sucessivos em branches com auto-deploy habilitado. Consolidar mudanças numa única atualização quando possível.
- Nunca promover código sem build, validação de fluxo relevante e plano de rollback.
- Produção só após validação explícita.

## Diagnóstico da tela de Projetos
- A UI anterior renderizava todos os projetos como cards clicáveis, cada um com exclusão. Substituído por seletor compacto + área 'Gerenciar projetos' aberta sob demanda.
- Há chamadas redundantes: bootstrap carrega projetos, clientes e decisões globais; efeitos subsequentes consultam decisões, riscos, conhecimento e membros ao mudar projeto; `handleActivateProject` também repete várias dessas consultas.
- Esses efeitos não são realtime (não existe assinatura realtime nesse componente), mas podem gerar chamadas concorrentes e repetidas.
- Próximos ganhos: reduzir listagem inicial a id/nome/cliente/status, buscar detalhes do projeto sob demanda; carregar módulos quando suas seções estiverem expandidas; cache SWR/React Query com invalidação após mutações, cancelamento de requisições e proteção contra respostas fora de ordem; paginação e índices para centenas de projetos.
- Medir p50/p95 de /api/projects, /api/projects/active, /api/projects/[id] e riscos/conhecimento/decisões com dataset realista. Não declarar ganho de performance sem benchmark.
- A autorização e o escopo por organização devem continuar no backend; seletor não é controle de segurança.
