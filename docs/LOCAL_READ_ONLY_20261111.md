# LOCAL-SEC-01 | Consultar o Commander oficial sem operar registros (11/11/2026)

Escopo: somente branch `work/local-kairos-operacional-20261111`. **Não** promover para develop/main antes de homologação.

## Proteções implementadas

- `COMMANDER_LOCAL_READ_ONLY=true`: middleware responde 403 para mutações em `/api/*`, exceto `POST /api/chat`.
- `POST /api/chat` em modo leitura: não persiste mensagens; retorna resposta efêmera; o Kairos não cria tarefas, riscos, projetos ou memórias.
- `getSupabaseServerClient` e `getSupabaseBrowserClient`: transporte Supabase customizado recusa chamadas de mutação e qualquer RPC, inclusive por GET. Login/refresh via `/auth/v1/*` permanece possível.
- Chamadas Supabase iniciadas no middleware também usam o transporte protegido.
- `NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY=true`: habilita a proteção nas chamadas do navegador.
- Essas flags só foram incluídas no script local, não nas configurações Vercel.
- Compatível com `next dev` e `next start` (proteção não depende de `NODE_ENV`).

## Limitações e risco residual

**Não é uma credencial read-only do Postgres.** Uma chave `service_role` continua com poder de escrita fora do código instrumentado, incluindo CLI, scripts, chamadas Supabase diretas ou clientes criados fora das fábricas verificadas. O login do Supabase Auth também pode atualizar metadados de sessão, e operações externas à API Supabase podem gerar efeitos colaterais. O bloqueio de API é HTTP e não substitui uma política de rede, RBAC ou permissão SQL restrita.

Não afirmar que o banco está integralmente protegido. NÃO executar testes destrutivos no Supabase oficial com chave de serviço. Revisar todos os caminhos de acesso direto e, idealmente, usar credenciais SQL somente leitura / autenticação com papel de visualizador antes de liberar para operação.

As mensagens locais do Kairos não ficam registradas no banco; a conversa pode não sobreviver a recarregamento.

## Validação local

```powershell
cd C:\Projetos\7Commander-local
git pull --ff-only origin work/local-kairos-operacional-20261111
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
Select-String -Path .env.local -Pattern '^(COMMANDER_LOCAL_READ_ONLY|NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY)='
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

Não copiar indiscriminadamente o arquivo de referência Vercel para `.env.local`: ele aponta ao Supabase oficial.

## Critérios para liberar navegação local com dados oficiais

1. Gates typecheck, lint, unit e build aprovados.
2. Testar POST/PUT/PATCH/DELETE em `/api/projects` e garantir HTTP 403, sem dados modificados.
3. Testar GET autenticado `/api/projects` e verificar autorização de organização.
4. Testar leitura de projetos, decisões, riscos e tarefas no browser.
5. Testar pergunta analítica no Kairos e confirmar que não surgiram novos registros, nem conversas/memórias no banco.
6. Inspecionar Network para garantir ausência de chamadas diretas ao Supabase fora do cliente protegido.

**Somente após os critérios 1–6** permitir conexão controlada à base oficial. Nunca habilitar operações de escrita para desenvolvimento sem autorização específica, revisão e estratégia de reversão.
