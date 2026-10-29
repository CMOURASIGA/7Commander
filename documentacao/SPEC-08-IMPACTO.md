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
