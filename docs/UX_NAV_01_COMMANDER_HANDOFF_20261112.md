# UX-NAV-01 | Preparação do piloto 7Commander
Data: 12/11/2026. Branch: `work/commander-ux-nav-01-20261112` criada a partir de `develop`.
Status: **preparação / sem código de interface alterado nesta branch**.

## Origem
- Referência corporativa: [proposta UX-NAV-01](https://github.com/CMOURASIGA/componentes_consult_services/blob/main/propostas/UX-NAV-01-sidebar-adaptativa-tabs.md).
- 7Service implementou piloto em `develop` e obteve aceite visual inicial com ressalvas, que **não** comprova automaticamente adoção no Commander.
- Padrões relacionados: UX-ICON-03 e RT-017 do 7Components.
- Isolar da branch extensa `work/local-kairos-operacional-20261111` enquanto SKILLS-02 não conclui P0.

## Objetivo
Desktop com sidebar 72px compacta / 256px expandida e conteúdo reposicionado sem overlay; mobile com drawer e foco; tabs contextuais sem perda de contexto, mantendo rotas, papéis, menu whitelabel e segurança do 7Commander.

## Auditoria obrigatória antes da implementação
1. Ler e mapear `components/layout/sidebar.tsx`, `components/layout/header.tsx`, `app/globals.css`, telas Projetos, Scrum, Kanban, Backlog, Daily e Relatórios.
2. Identificar quais grupos realmente precisam de tabs; evitar abas redundantes ou múltiplos níveis de navegação.
3. Medir largura útil baseline por resolução (desktop 1366 e 1440, tablet e mobile); identificar fluxo de navegação atual de perfis autorizados.
4. Preservar menu/rotas do white-label e seleção de empresa, inclusive viewer, sem alterar autorização de servidor.

## MVP visual
- Sidebar compacta com tooltips e `aria-label`; expandida com ícone, rótulo e grupo.
- Toggle com persistência apenas da preferência visual, sem SSR/hidratação divergente.
- Desktop reflow sem sobreposição; mobile drawer com Escape, foco, fechamento ao navegar.
- Tabs de contexto reutilizáveis para telas com subáreas reais, primeiro Scrum/Projeto; estado coerente com URL e histórico.
- Padronização dos botões/ícones sem reverter as implementações já homologadas em develop.

## Critérios de aceite
- Não alterar banco, papéis, RLS, status Scrum ou lógica Kairos.
- Links profundos, back/forward, refresh, troca de organização e logout sem regressão.
- Operações viewer continuam somente leitura e controle permanece no servidor.
- Sem rolagem horizontal involuntária, teclado e reduced-motion funcionando.
- Evidência visual antes/depois e verificação de benefício, não apenas impressão estética.
- `lint`, `typecheck`, `build` e testes de navegação PASS antes de PR.

## Dependência de integração
O piloto de UI pode avançar **isoladamente** nesta branch, mas nenhum merge em `develop` enquanto houver regressão de QA ou interferência com correções essenciais do Kairos. Promoção em `main` depende de autorização explícita. Separar PR de UX e PR de Kairos: a branch Kairos divergente não deve ser mesclada em bloco.
