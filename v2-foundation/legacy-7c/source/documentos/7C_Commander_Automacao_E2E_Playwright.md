# 7C Commander - Automacao E2E com Playwright

## Objetivo
Executar o fluxo E2E do sistema sem intervencao manual, gerando evidencias (screenshot/trace/video) e relatorio HTML.

## Estrutura implementada
```text
tests/e2e/
  auth.spec.ts
  clientes.spec.ts
  projetos.spec.ts
  workspace.spec.ts
  artefatos.spec.ts
  biblioteca-artefatos.spec.ts
  cleanup.spec.ts
tests/fixtures/
  e2e-data.ts
tests/helpers/
  auth.ts
  clientes.ts
  projetos.ts
  artefatos.ts
playwright.config.ts
```

## Pre-requisitos
1. Node.js 18+.
2. Dependencias instaladas.
3. Browser do Playwright instalado.
4. No Linux/WSL, dependencias nativas do Chromium provisionadas no ambiente executor.

Comandos:
```powershell
npm install
npm run test:e2e:setup
```

### Linux/WSL (provisionamento one-time)
Para preparar bibliotecas nativas (ex.: `libnspr4.so`), execute **uma vez** no provisionamento do ambiente:

```bash
npx playwright install --with-deps chromium
```

ou via script do projeto:

```bash
npm run test:e2e:setup:linux-deps
```

Observacao:
- `npm run test:e2e` **nao** roda `--with-deps` automaticamente (para evitar prompt/sudo interativo).
- O `pretest:e2e` instala apenas browser (`npx playwright install chromium`) de forma nao interativa.

Se ocorrer erro de permissao no provisionamento Linux/WSL, execute com permissao administrativa:

```bash
sudo npx playwright install --with-deps chromium
```

## Como executar
```powershell
npm run test:e2e
```

Variantes:
```powershell
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:report
```

## Cobertura funcional da suite
- login e acesso inicial
- CRUD de clientes por icones em cards
- CRUD de projetos por icones em cards
- selecao de datas pelo calendario
- abertura de workspace por icone
- bloqueio de exclusao de cliente com projeto vinculado
- validacao de contraste em tema claro e escuro
- criacao de artefato via drawer
- edicao de artefato
- criacao de nova versao de artefato
- exclusao de artefato
- abertura de link externo
- biblioteca de artefatos organizada por projeto
- cleanup final de projeto e cliente de teste

## Evidencias configuradas
- `screenshot: only-on-failure`
- `trace: retain-on-failure`
- `video: retain-on-failure`
- relatorio HTML em `playwright-report/`

## Observacoes importantes
1. A suite usa massa dinamica por execucao (`tests/fixtures/e2e-data.ts`) para evitar conflito entre runs.
2. Foram adicionados seletores estaveis (`data-testid`) nos pontos criticos para reduzir fragilidade de E2E.
3. O `webServer` do Playwright sobe a aplicacao automaticamente em `http://127.0.0.1:4173` com `--strictPort`.
4. O `workers` padrao da suite foi fixado em `1` para reduzir flakiness de ambiente (pode sobrescrever com `PW_WORKERS`).
5. O script `pretest:e2e` chama `test:e2e:setup` antes dos testes para preparar browser sem prompt interativo.

## Esteira CI recomendada
Antes do passo de testes E2E, executar:

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e
```

Com isso, o executor Linux/WSL fica pronto antes da suite funcional e o comando principal roda sem interacao manual.
