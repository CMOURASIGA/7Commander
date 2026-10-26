# SPEC 10 — Workbench integrado de pré-venda e análise (lote em desenvolvimento)

## Situação real
**Lote funcional parcial e ainda não homologado.** Migrations `048` a `053` foram criadas em `develop`; nenhuma foi aplicada ao Supabase de produção. Não houve deploy manual nesta rodada.

### Implementado em código
- **CRM:** prospects, oportunidades, etapas comerciais, referência cruzada, conversão humana de prospect ganho em cliente via RPC transacional/idempotente (migration 049).
- **Planejamento:** registros de requisitos, alternativas, avaliações e decisões com versão otimista, estados de revisão e auditoria por versão; GET paginado (25), POST e PATCH autenticados.
- **Histórico:** rota para consultar snapshots de registros versionados.
- **Matriz:** relacionamento requisito × alternativa por projeto, fonte e data de conferência. Apenas relações verificadas entram no score — nunca atribuir score à cobertura não avaliada (migration 051).
- **Governança:** execução com chave idempotente, checkpoint e transições de etapa aprovadas manualmente; não dispara agentes automaticamente (migration 050).
- **Pesquisa externa opcional:** provedor Brave Web Search, desligado por padrão, opt-in por consulta pública, filtragem básica de PII, timeout, sem redirecionamentos, limites diários transacionais (10 por organização), fontes exibidas como não verificadas (migration 052). Requer configuração voluntária de credenciais, que não foram cadastradas. Resultados não são armazenados automaticamente.
- **Interface:** `/planning`, `/planning/coverage`, `/planning/workflows`, `/planning/backlog`, menu, estados de gravação e revisão humana.
- **Requisitos:** revisão determinística de aceites ausentes, falta de fonte/categoria, títulos duplicados e termos subjetivos, sempre sem alteração automática.
- **Backlog:** a partir de requisito e decisão formalmente aprovados, criado apenas após confirmação humana, usando chave única de origem em `tasks` (migration 053).
- **Qualidade:** workflow de GitHub Actions acionável manualmente para typecheck, lint e build, além de testes de interface sintéticos. Ainda não executados.

### Bloqueadores antes de concluir todas as SPECs 01–05
1. Kanban comercial pleno, filtros por responsável e SLA, upload/importação CSV idempotente e exportação autorizada.
2. Baselines imutáveis de requisitos, dependências estruturadas, ingestão de arquivos, detecção automática de conflitos e interface de aprovações detalhada.
3. Provedor de pesquisa ainda sem credenciais; precisa de avaliação de custo, quota por cliente, licenciamento, compliance, logs e testes reais de consulta. Não habilitar por padrão.
4. Matriz com pesos, cobertura de **todos** os requisitos, custos verificáveis, comparador build/buy/híbrido e decisão com snapshot imutável.
5. Geração de backlog por requisito e decisão aprovados foi implementada no código com chave única de origem (migration 053). Faltam testes transacionais, integração com responsável/notificações e rastreamento detalhado de decisão → evidência → requisito.
6. Orquestrador de IA persistente com jobs assíncronos, reprocessamento seguro, limite de custo/modelo e integrações autônomas autorizadas. O painel atual é manual.
7. Melhorar isolamento multiempresa parametrizado (nesta implementação o escopo é Consult Services), corrigir atomicidade total de gravações/auditorias e completar auditoria RBAC/RLS.
8. Executar migrations somente em ambiente seguro de homologação, qualidade técnica, testes de integração/concorrência, segurança e validação humana antes de produção.

### Roteiro único da homologação integrada (somente após conclusão)
1. Conta superadmin e gestor, sessão isolada; leitor e usuário desativado sem escrita; acesso indevido a outro tenant deve falhar.
2. Cadastrar prospect fictício, oportunidades e etapas; converter ganho em cliente preservando trilha, sem duplicatas.
3. Vincular projeto de diagnóstico ao cliente, criar baseline v1 e requisito v2; conferir histórico/aceite/aprovação.
4. Pesquisar solução externa com fontes e datas, marcar ausências como não verificadas; testar proteção de URL e PII.
5. Comparar alternativa e desenvolvimento interno com cobertura por requisito; aprovar decisão e gerar backlog idempotente.
6. Kairos registra múltiplos riscos separadamente e preserva falha parcial/idempotência.
7. Atribuir atividades entre Christian e Rodrigo, salvar, reabrir, ver sino e aviso central.
8. Desativar usuário; verificar revogação e isolamento imediato. Testar concorrência e versão de registros.
9. Arquivar projeto e excluir apenas QA sem histórico; impedir exclusão com tarefas reais.
10. Medir p50/p95 e requisições com 2, 30 e 300 projetos; verificar mobile e desktop.
11. Validar audit trail, backup, rollback, SHA de develop e separação demo/main.
12. Registrar PASS/FAIL e evidências e só então decidir promoção.

**Gate:** Não declarar READY nem liberar clientes reais até migração em ambiente de homologação, build/testes automáticos e assinatura da validação humana.
