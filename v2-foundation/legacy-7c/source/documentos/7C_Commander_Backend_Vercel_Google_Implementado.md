# 7C Commander - Backend Vercel + Google (Implementado nesta entrega)

## Escopo entregue

Esta entrega implementa a base backend para execução serverless no Vercel com:

- autenticação Google OAuth2 (Authorization Code)
- sessão segura por cookie HTTP-only
- persistência relacional com Prisma/Postgres
- provisionamento idempotente de Drive e Sheets
- endpoints de clientes, projetos, compartilhamento, artefatos e histórico
- autorização por papel (owner/editor/viewer)
- sincronização inicial com Google Sheets

## Estrutura criada

```text
api/
  health.ts
  auth/
    me.ts
    logout.ts
    google/
      url.ts
      callback.ts
  google/
    context.ts
    provision.ts
  clients/
    index.ts
    [id].ts
  projects/
    index.ts
    [id].ts
    [id]/artifacts.ts
    [id]/history.ts
    [id]/share.ts
    [id]/members/index.ts
    [id]/members/[memberId].ts
  artifacts/
    [id].ts
    [id]/version.ts

backend/
  auth/
  config/
  db/
  http/
  services/

prisma/
  schema.prisma
```

## Scripts adicionados

```bash
npm run backend:typecheck
npm run db:generate
npm run db:migrate:dev
npm run db:migrate:deploy
```

## Variáveis de ambiente

Foram adicionadas no `.env.example`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `SESSION_SECRET`
- `APP_BASE_URL`
- `FRONTEND_URL`
- `DATABASE_URL`
- `GOOGLE_DRIVE_ROOT_FOLDER_NAME`
- `GOOGLE_MASTER_SHEET_NAME`
- `COOKIE_DOMAIN`
- `COOKIE_SECURE`
- `NODE_ENV`

## Endpoints implementados

### Auth
- `GET/POST /api/auth/google/url`
- `POST /api/auth/google/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Google
- `GET /api/google/context`
- `POST /api/google/provision`

### Clientes
- `GET /api/clients`
- `POST /api/clients`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`

### Projetos
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

### Compartilhamento
- `GET /api/projects/:id/members`
- `POST /api/projects/:id/share`
- `PUT /api/projects/:id/members/:memberId`
- `DELETE /api/projects/:id/members/:memberId`

### Artefatos
- `GET /api/projects/:id/artifacts`
- `POST /api/projects/:id/artifacts`
- `PUT /api/artifacts/:id`
- `DELETE /api/artifacts/:id`
- `POST /api/artifacts/:id/version`

### Histórico
- `GET /api/projects/:id/history`

## Validação executada

- `npm run db:generate` ✅
- `npm run backend:typecheck` ✅
- `npm run build` ✅
- `npm run test:e2e -- --workers=1` ✅

## Atualização desta etapa

- Frontend ajustado para modo `api` nas telas de Clientes, Projetos, Workspace e Biblioteca de Artefatos.
- CRUD e compartilhamento nessas telas passam a persistir via backend quando `VITE_BACKEND_MODE=api`.
- Campo `description` de projeto incluído no backend (schema + endpoints + mapeamento frontend).

## Próximos passos recomendados

1. Criar migration versionada em banco real (`prisma migrate dev` / `deploy`).
2. Adicionar testes E2E dedicados ao modo `api`.
3. Refinar sincronização bidirecional com Google Sheets (update/upsert por chave).
4. Adicionar testes automatizados de API (auth/authorization/sharing).
5. Configurar deploy no Vercel com variáveis de ambiente de produção.
