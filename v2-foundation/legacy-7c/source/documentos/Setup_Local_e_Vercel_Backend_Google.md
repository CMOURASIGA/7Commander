# Setup para validar localmente e no Vercel

## 1) Pré-requisitos

- Node 20+
- npm 10+
- PostgreSQL disponível
- Projeto Google Cloud com OAuth 2.0, Google Drive API e Google Sheets API habilitadas
- Vercel CLI (`npm i -g vercel`) para validar API local com Functions

## 2) Variáveis obrigatórias

Use um arquivo `.env.local` na raiz com **frontend + backend**.

### Frontend (Vite)

```env
VITE_APP_NAME=7C Commander
VITE_APP_ENV=development
VITE_WEBAPP_BASE_URL=http://localhost:5173

VITE_AUTH_MODE=google
VITE_BACKEND_MODE=api
VITE_API_BASE_URL=http://localhost:3000

VITE_GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID
VITE_GOOGLE_API_KEY=SEU_GOOGLE_API_KEY
```

### Backend (API)

```env
GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=SEU_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

SESSION_SECRET=gere-um-segredo-forte
SESSION_TTL_HOURS=168

APP_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/pmcc?schema=public

GOOGLE_DRIVE_ROOT_FOLDER_NAME=PM Command Center
GOOGLE_MASTER_SHEET_NAME=PM Command Center - Controle

COOKIE_DOMAIN=
COOKIE_SECURE=false
NODE_ENV=development
```

## 3) Configuração obrigatória no Google Cloud

No cliente OAuth 2.0 (Web):

- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/google/callback`
  - `https://SEU-PROJETO.vercel.app/api/auth/google/callback`
- Authorized JavaScript origins:
  - `http://localhost:5173`
  - `https://SEU-PROJETO.vercel.app`

## 4) Como validar localmente (backend real)

1. Instalar dependências:

```bash
npm install
```

2. Gerar Prisma client e aplicar schema no banco:

```bash
npm run db:generate
npm run db:push
```

3. Subir API (Vercel Functions) na porta 3000:

```bash
vercel dev --listen 3000
```

4. Em outro terminal, subir frontend:

```bash
npm run dev
```

5. Acessar `http://localhost:5173`, logar com Google e validar:

- criação/edição/exclusão de clientes
- criação/edição/exclusão de projetos
- workspace, compartilhamento e artefatos

## 5) Variáveis no Vercel (produção)

No painel do projeto Vercel, configure todas as variáveis abaixo:

- `VITE_APP_NAME`
- `VITE_APP_ENV=production`
- `VITE_WEBAPP_BASE_URL=https://SEU-PROJETO.vercel.app`
- `VITE_AUTH_MODE=google`
- `VITE_BACKEND_MODE=api`
- `VITE_API_BASE_URL=` (deixe vazio para usar mesma origem)
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://SEU-PROJETO.vercel.app/api/auth/google/callback`
- `SESSION_SECRET`
- `SESSION_TTL_HOURS`
- `APP_BASE_URL=https://SEU-PROJETO.vercel.app`
- `FRONTEND_URL=https://SEU-PROJETO.vercel.app`
- `DATABASE_URL`
- `GOOGLE_DRIVE_ROOT_FOLDER_NAME`
- `GOOGLE_MASTER_SHEET_NAME`
- `COOKIE_DOMAIN` (opcional; ex: `.seu-dominio.com`)
- `COOKIE_SECURE=true`
- `NODE_ENV=production`

## 6) Checklist rápido de validação

- `/api/health` responde `200`
- login Google conclui e cria sessão
- `/api/auth/me` retorna `authenticated: true`
- primeiro login provisiona Drive/Sheets sem duplicar estrutura
- CRUD de cliente/projeto/artefato funciona com `VITE_BACKEND_MODE=api`
