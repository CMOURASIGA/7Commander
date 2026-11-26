# Commander Demo, manutenção e sincronização

## Arquitetura

A demonstração usa o mesmo frontend da produção. A variável `NEXT_PUBLIC_COMMANDER_DEMO_MODE=true` ativa três adaptações isoladas:

1. autenticação local simulada em `lib/demo/auth-client.ts`;
2. adaptador central de APIs e persistência em `lib/demo/runtime.ts`;
3. massa fictícia versionada em `fixtures/demo/production-parity-seed.json`.

Nenhum componente operacional acessa diretamente o LocalStorage. As telas continuam usando as mesmas APIs do frontend e o adaptador local intercepta somente requisições `/api/*` no navegador. Requisições externas não são encaminhadas quando representam integrações simuladas.

## Atualização a partir da produção

```bash
git fetch origin main
git switch demo/production-localstorage-20261126
git merge --no-ff origin/main
npm ci
NEXT_PUBLIC_COMMANDER_DEMO_MODE=true npm run typecheck
NEXT_PUBLIC_COMMANDER_DEMO_MODE=true npm run build
NEXT_PUBLIC_COMMANDER_DEMO_MODE=true npm run test:e2e -- tests/e2e/demo-localstorage.spec.ts
```

Após o merge, procure novos endpoints usados pelo frontend e inclua seus contratos no adaptador central. Não replique regras de LocalStorage dentro de páginas ou componentes.

## Atualização da massa

- Use somente empresas, pessoas, e-mails e situações fictícias.
- Preserve IDs UUID e relacionamentos entre `organization_id`, `project_id`, `clientId`, `sprint_id` e `record_id`.
- Use datas relativas no gerador ou atualize `referenceDate` e os períodos antes de cada publicação relevante.
- Incremente `version` quando houver alteração incompatível da estrutura. A opção de restauração sempre recria a massa publicada.

## Publicação segura

- Projeto Vercel exclusivo da demonstração.
- Variável pública obrigatória: `NEXT_PUBLIC_COMMANDER_DEMO_MODE=true`.
- Não cadastrar variáveis Supabase, OpenAI, Google, n8n ou Access Management Service.
- Confirmar no bundle e nos logs que não há URL, chave ou token de produção.
- Validar login, CRUD, troca de empresa, recarga, restauração, relatórios e responsividade antes de promover o deployment.

