# Executar 7Commander localmente (Windows/PowerShell)

## Branch de trabalho
Base: develop em 2026-11-11.
Branch: work/local-kairos-operacional-20261111.

## Primeira instalação
```powershell
cd C:\Projetos
git clone https://github.com/CMOURASIGA/7Commander.git 7Commander-local
cd .\7Commander-local
git fetch origin
git switch --track origin/work/local-kairos-operacional-20261111
npm ci
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
```

Se a pasta já existe, dentro dela:
```powershell
git status
git fetch origin
git switch --track origin/work/local-kairos-operacional-20261111
npm ci
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
```
Não rode `git switch` se tiver alterações não commitadas; salve-as antes.

## Variáveis locais

O arquivo .env.local é individual e ignorado pelo Git. **Nunca commitar segredos.**
O setup cria .env.local com as chaves de .env.example, mas não as preenche.

Para obter os valores cadastrados no Preview da branch develop na Vercel:
```powershell
npm install -g vercel
vercel login
vercel link
vercel env pull .env.develop-reference.local --environment=preview --git-branch=develop
```
No `vercel link`, selecionar o projeto `7-commander` do workspace `CHRISTIAN's projects`.
O download pode omitir valores de secrets, dependendo da configuração; nesse caso preencher manualmente através dos controles autorizados.

**ATENÇÃO**: preview/develop não implica ambiente de banco segregado.
Antes de copiar valores para .env.local, confira se o Supabase URL é o projeto QA **separado**, e não o 7Commander de produção.
Nunca fazer importação/destruição de dados, migration ou testes de gravação no banco produtivo.
Não utilizar credenciais de produção de 7Service, OpenAI, Supabase service_role ou tokens de usuários reais em testes locais sem necessidade e aprovação.

Preencher no .env.local:
```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO-QA.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHAVE_PUBLICA_QA
SUPABASE_SERVICE_ROLE_KEY=CHAVE_SERVICE_ROLE_QA
OPENAI_API_KEY=CHAVE_DE_DESENVOLVIMENTO
KAIROS_ENABLE_LOCAL_FALLBACK=false
```
Completar as flags de tenant/autenticação do ambiente QA conforme a configuração efetivamente testada.
Variáveis `NEXT_PUBLIC_*` são públicas ao navegador; nunca colocar secrets nelas.

## Gates locais
```powershell
npm run env:check
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run dev
```
Acessar http://localhost:3000.
Registrar resultado por commit/entrega, incluindo testes funcionais e sem dados inventados.
Se usar testes E2E, executar somente com base QA e usuário de testes.

## Publicação
1. Trabalho em `work/local-kairos-operacional-20261111`; commits e testes locais.
2. PR para `develop` após testes PASS; homologação na Vercel.
3. Separar release operacional do Kairos. Não incluir novo Kairos na produção enquanto não homologado.
4. PR para `main` somente com autorização explícita e gates PASS.

Não configurar build da branch local na Vercel: a política existente executa previews apenas em develop e main.
