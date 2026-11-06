# SPEC 08 — Auditoria e mapa de impacto (CP-01 parcial)

Status: arquitetura inicial em desenvolvimento; não homologada. Branch `develop`. Nenhuma publicação ou migração aplicada.

## Stack comprovada
Next.js 15, React 19, TypeScript 5, Supabase JS 2, OpenAI SDK 4; testes Playwright, GitHub Actions com typecheck, lint e build. O pacote `ai` do Vercel AI SDK ainda **não existe** nas dependências.

## Reutilização
- Autenticação: `lib/api-auth.ts`.
- Contexto multiempresa, roles: `lib/tenant-runtime.ts`, `lib/tenant-context.ts`.
- API server service role: `lib/supabase/server.ts`.
- Módulos: projetos, tarefas, riscos, planejamento, decisões, conhecimento e `components/notifications/task-alerts.tsx`.
- Layout e navegação: `components/layout/sidebar.tsx`; sem novo aplicativo, iframe ou chatbot.
- Kairos e Voice: sem alterações.
- Qualidade: `.github/workflows/develop-quality.yml`, Playwright.

## Contrato e separações
`lib/operational-intelligence.ts`: input validado e verdict estruturado. `lib/operational-provider.ts`: contrato agnóstico do fornecedor, simulação determinística, flag desligada por padrão. `app/api/operational-decisions/route.ts`: autenticação, role, tenant, leitura e criação somente com modo simulado. Entidades reais NÃO são enviadas ao provedor nesta fase.

## Integração Jev
Vercel publicou que `experimental_decide` requer `ai >=7.0.128`; Jev 1.14 usa `typesafe-ai/jev-1.14.0` via AI Gateway. Após aprovar dependências/consumo, criar adaptador isolado com limites e custo. Não afirmar integração real ou benchmarks sem execução.

## Segurança e pendências
Migration 066 aditiva, RLS ativada, acesso SQL direto de anon/authenticated revogado. O endpoint deve permanecer indisponível enquanto `SEVEN_COMMANDER_DECISIONS_MODE` não for `simulation`; modo real exige autorização de orçamento, contrato e testes. Pendências CP-02: auditoria de revisão, idempotência, quotas. CP-03 a CP-07 não homologados.

## CP adicional — Adaptador Jev em modo observação (29/10/2026)

Integração HTTP server-side com o endpoint oficial do AI Gateway `POST /v1/evaluate` implementada em `lib/jev-gateway-adapter.ts`, encapsulada em contrato independente. Este caminho HTTP é compatível com a documentação atual do Gateway, **não equivale à integração solicitada com `experimental_decide` do AI SDK**, ainda pendente de dependências e lockfile testados.

Variáveis (todas apenas no servidor):
- `SEVEN_COMMANDER_DECISIONS_MODE=disabled|simulation|observation` (padrão disabled).
- `SEVEN_COMMANDER_JEV_ENABLED=true` é necessário para observar.
- `SEVEN_COMMANDER_JEV_COST_APPROVED=true` exige autorização explícita após orçamento.
- `AI_GATEWAY_API_KEY` somente no servidor.

Limites iniciais: somente contextos sintéticos marcados pelo chamador, respostas fechadas e verificadas, timeout de 8 segundos, nenhum retry automático, até 10 avaliações persistidas por organização em janela de uma hora e nenhuma ação de negócio. São salvaguardas iniciais, não garantia contra chamadas simultâneas ou cobrança fora das cotas; adicionar limitação transacional, estimativa de custo e rastreamento completo antes de dados reais.

Banco: migrations 066 e 067 permanecem **não aplicadas**. Revisões humanas registradas por gatilho após aplicar as duas. A central permite consulta, filtros e avaliação em simulação/observação mediante flags.

Referência de testes: `tests/fixtures/spec08-labeled-candidates.jsonl`, 105 casos **candidatos a rotulagem humana**, não um benchmark executado. Casos adversariais, testes de isolamento real e avaliação comparativa Jev permanecem pendentes.

### Critérios não concluídos
- Adicionar AI SDK 7.0.128+ em pacote e lockfile e escolher formalmente SDK vs HTTP.
- Avaliações com fontes reais server-side e contratos por módulo, após DPA, consentimento e minimização.
- Limites de custo efetivos e atômicos, medição de tokens/latência e trilha de execução.
- Benchmark real de 100 casos revisados, acurácia, criticidade e custo medidos.
- Build, typecheck, lint e homologação em Preview. Nenhum deploy nesta etapa.

Fontes técnicas: Vercel *AI SDK evaluation to decisions* (2026-10-07), *6 ways to integrate Jev* (2026-10), Jev 1.14 AI Gateway listing.

## Integração operacional segura aos sete módulos (CP-03/04 — 29/10/2026)

Foram adicionados `services/operational-source-service.ts` e `app/api/operational-decisions/source/route.ts`. Os dados são consultados no servidor com `organization_id` obtido da sessão: projetos, Kanban/tarefas, riscos, comercial (prospects/oportunidades), decisões, base de conhecimento e notificações derivadas de tarefas. Esse endpoint **usa exclusivamente a rubrica determinística de simulação**, mesmo quando o modo global estiver em observação, e não envia dados reais a provedor externo.

A Central permite informar o UUID de origem, consultar o resultado e revisá-lo. Existe teste Playwright da integração e da feature flag desativada. O conjunto de 105 casos possui auditoria estática em `scripts/spec08-fixture-audit.mjs`; **não é benchmark real** nem passou por validação humana.

Migration 068 adiciona log de execução isolado por empresa. A tabela de telemetria ainda requer integração de escrita nos serviços e validação de limites e retenção. As migrations 066–068 continuam aguardando autorização para aplicação em ambiente remoto. A funcionalidade de avaliação de registros reais permanece desligada por padrão até que essas migrations estejam disponíveis e os gates sejam aprovados.

### Matriz de aceite — estado atual

| CP | Estado | Bloqueador |
|---|---|---|
| CP-01 Fundação | Implementação inicial | Compatibilidade final do SDK e build |
| CP-02 Persistência/segurança | Migrations versionadas | Aplicação controlada, idempotência transacional e testes RLS |
| CP-03 Operacional | Coleta normalizada e simulação integradas | Contratos completos por módulo, benchmarks |
| CP-04 Complementar | Coleta normalizada e simulação integradas | Relevância de notificações e validação humana |
| CP-05 Central | Interface, filtros e revisão implementados | Custos e detalhamento operacional completos |
| CP-06 Laboratório | 105 candidatos e testes preparados | Rotulagem humana, chamadas Jev reais, testes executados |
| CP-07 Estabilização | Documentação e telemetria preparada | Gates de compilação, QA e relatório final |

**Decisão de segurança:** não habilitar Jev real para registros operacionais nem mover para `main` até validação de privacidade, orçamento, benchmark e testes de isolamento. A existência de código não satisfaz o critério de homologação da SPEC.

## Revisão técnica de encerramento — 29/10/2026

A compatibilidade HTTP foi confirmada nas publicações da Vercel: `POST /v1/evaluate` continua disponível, com `state`, `questions` e `answers`. O contrato do AI SDK `experimental_decide` exige `ai >=7.0.128` e sua migração permanece opcional quando o adaptador HTTP atende à integração.

**Ainda não concluído:** a cota implementada nos endpoints utiliza contagem antes da chamada, não reserva transacional; chamadas concorrentes podem ultrapassar o limite. A migration 069 proposta para reserva atômica não foi integrada nesta execução e precisa ser implementada e testada antes de ativar a observação paga. O código também não fornece benchmarks reais de acurácia/latência ou validação de isolamento em ambiente homologado. Não ativar `SEVEN_COMMANDER_DECISIONS_MODE=observation` até esses critérios passarem.

Documentação externa consultada: https://vercel.com/i/ai-sdk-evaluation-to-decisions e https://vercel.com/i/jev-integrations.
