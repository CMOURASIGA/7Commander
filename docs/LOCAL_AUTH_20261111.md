# LOCAL-AUTH-01 | Acesso aos dados existentes via Supabase RLS

**Branch:** `work/local-kairos-operacional-20261111` (não publicar em `develop` ou `main`).

## Decisão

Acesso local **somente leitura** ao Supabase oficial `pmituaahaqimvhzhqsry`, sem criar outro banco e sem usar `service_role`.

- O login em `http://localhost:3000`, quando `NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY=true`, usa Supabase Auth local da identidade existente, não o broker do 7Service.
- A rota `/api/auth/local-session` continua validando o JWT no Supabase Auth, e apenas grava cookie HttpOnly de sessão (não grava no banco de dados).
- Middleware de páginas, **somente em localhost + flag local**, verifica JWT, plataforma admin ativa e participação ativa em alguma organização, utilizando a chave pública com JWT e RLS.
- Cada API chama `requireApiAuth`; em modo somente leitura, a identidade é validada pelo Auth e pelo RLS de `platform_admins` e `organization_members`. Usuários externos sem papel de platform admin são recusados nesse fluxo. Não há bypass de autorização do 7Service para usuários clientes.
- `getSupabaseServerClient` usa **apenas** `NEXT_PUBLIC_SUPABASE_ANON_KEY` mais JWT por contexto assíncrono da requisição, e não usa `SUPABASE_SERVICE_ROLE_KEY` no modo local.
- Todas as consultas são sujeitas às políticas RLS existentes do Supabase; nenhum grant novo foi criado.
- `readOnlySupabaseFetch` recusa mutações PostgREST/Storage/Functions, qualquer RPC e mutações Auth exceto login, refresh, verify e logout.
- Chat do Kairos responde sem persistir mensagens e sem autoescritas; outros POSTs ficam bloqueados.
- `npm run env:check` exige apenas URL, chave pública e URL da aplicação no modo leitura, e **recusa service_role preenchida**.

## Configuração sem exibir segredos

Em `.env.local`, garantir:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://pmituaahaqimvhzhqsry.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<CHAVE PUBLICA OBTIDA NO ARQUIVO DA VERCEL>
SUPABASE_SERVICE_ROLE_KEY=
COMMANDER_LOCAL_READ_ONLY=true
NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY=true
```

Não copiar indiscriminadamente a configuração Preview, pois pode apontar para produção e conter privilégios administrativos. Apenas as duas variáveis públicas podem ser utilizadas no ambiente local. Mantenha outras chaves de integração vazias até necessidade específica.

**Verificação:**

```powershell
git pull --ff-only origin work/local-kairos-operacional-20261111
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
npm run env:check
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run dev
```

Entrar com operador interno ativo já existente em Supabase Auth, sem cadastro ou provisionamento.

## Aceite e restrições

1. Login de operador interno existente funciona e suas empresas aparecem.
2. GET de projetos autorizados responde 200 e listagens são filtradas por RLS.
3. Chamada sem JWT retorna 401; usuário sem papel interno retorna 403.
4. POST/PUT/PATCH/DELETE de dados retornam 403. Uma pergunta analítica ao Kairos não cria projeto, risco, atividade nem memória.
5. Nenhuma credencial `service_role` está configurada localmente; nenhum SQL DDL/DML é executado no banco.
6. Nenhuma alteração de flags da Vercel ou deploy foi feito.

**Limitações:** a proteção é de aplicação, não uma credencial SQL com privilégio SELECT exclusivo. Operações próprias de login (Auth token) podem criar/atualizar registros de sessão do Supabase Auth. RLS controla quais dados podem ser lidos e o guard HTTP limita as escritas instrumentadas. Navegadores, ferramentas e código externo à aplicação exigem controles próprios. Endpoints que pressupõem privilégios administrativos podem retornar 403/503 em modo leitura; isso deve ser tratado por API, sem restaurar `service_role`.

Foi verificado que `platform_admins` permite SELECT do próprio usuário e que `internal_user_access` não permite SELECT a `authenticated`. Por isso este modo local está restrito a administradores de plataforma ativos.

## Correção de contexto multiempresa (11/11)

O acesso visual local autenticou, mas mostrou 0 projetos e "Empresa ativa não confirmada". A causa identificada foi a falta de habilitação dos flags de leitura multiempresa no setup local: a aplicação recorria ao `CONSULT_ORG_ID` fixo, ignorando o `profiles.active_organization_id` da identidade autenticada.

Consulta SQL **somente leitura** confirmou que o usuário interno tem `7CONSULTING` como organização ativa e possui projetos registrados nela. Nenhuma alteração no banco foi feita.

O `setup-local.ps1` agora força `SEVEN_COMMANDER_TENANT_SCHEMA_READY=true` e `SEVEN_COMMANDER_MULTI_TENANT_READY=true` somente no arquivo `.env.local`. O código existente de `getEffectiveTenantForUser` resolve a empresa por perfil e membership, sob RLS. A troca de empresa via POST continua bloqueada no modo de leitura: a validação inicial deve usar a empresa já ativa, sem alterar perfil.
