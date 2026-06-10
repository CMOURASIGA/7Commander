# 7C Commander

Plataforma de gestao de projetos orientada por fluxo:

`Login > Cliente > Projeto > Agente > Artefatos`

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Zustand (cache local)
- Vercel Functions (API)
- Prisma + Postgres
- Google OAuth2 + Drive API + Sheets API

## Arquitetura implementada nesta base

- Navegacao principal: Inicio, Clientes, Projetos, Artefatos, Agentes, Ajuda, Configuracoes.
- Workspace do projeto com abas:
  - Visao Geral
  - Contexto
  - Agentes
  - Artefatos
  - Historico
  - Compartilhamento
- Entidades principais:
  - Cliente
  - Projeto
  - Artefato com versionamento (`v1`, `v2`, ...)
  - Historico de eventos
  - Compartilhamento por email e papel

## Versionamento de artefatos

Suporte a duas estrategias:

- `Sobrescrita controlada`: atualiza a versao atual.
- `Nova versao`: cria `v+1` preservando historico.

Metadados armazenados por artefato:

- versao atual
- autor de criacao
- autor da ultima atualizacao
- data de criacao
- data de atualizacao
- status (`DRAFT`, `ACTIVE`, `FINAL`, `ARCHIVED`)

## Agentes externos configurados

- Storyboard Intelligence Architect
- PM AI Partner
- BPMN Master Architect
- Status Report Executive Architect

Links configuraveis via variaveis `VITE_AGENT_*`.

## Configuracao local (modo rapido)

1. Instale dependencias:

```bash
npm install
```

2. Crie seu arquivo `.env.local` a partir de `.env.example`.
3. Rode em modo local (`VITE_BACKEND_MODE=local`):

```bash
npm run dev
```

4. Para build de validacao:

```bash
npm run build
```

## Configuracao local com backend real (OAuth + Drive + Sheets)

Guia completo: [documentos/Setup_Local_e_Vercel_Backend_Google.md](documentos/Setup_Local_e_Vercel_Backend_Google.md)

Resumo de comandos:

```bash
npm run db:generate
npm run db:push
vercel dev --listen 3000
# em outro terminal
npm run dev
```

## Variaveis de ambiente (principais)

Arquivo base: `.env.example`

Principais variaveis:

- `VITE_AUTH_MODE=local|google`
- `VITE_BACKEND_MODE=local|api`
- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `DATABASE_URL`
- `SESSION_SECRET`
- `VITE_AGENT_SAI_URL`
- `VITE_AGENT_PM_URL`
- `VITE_AGENT_BPMN_URL`
- `VITE_AGENT_STATUS_URL`
- `VITE_ENABLE_EXTERNAL_AGENT_LINKS`
- `VITE_ENABLE_INTERNAL_HTML_PREVIEW`
- `VITE_ENABLE_GOOGLE_DOC_PREVIEW`
- `VITE_ENABLE_BPMN_IMAGE_PREVIEW`

## Observacao de validacao

A base atual roda e valida fluxo completo em modo local (`VITE_AUTH_MODE=local`) com persistencia em `localStorage`.

Integracoes Google (OAuth/Drive/Sheets) estao preparadas por configuracao de ambiente e podem ser ativadas ao fornecer credenciais e provider real.
