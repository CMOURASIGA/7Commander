# UX-ICON-03 | Handoff para responsável pelo padrão de ícones

**Projeto:** 7Commander / Consult Services
**Data:** 11/11/2026
**Situação:** CSS atualizado na branch local; aguarda homologação visual e execução dos gates.
**Branch:** `work/local-kairos-operacional-20261111`
**Não realizar:** merge para `develop` ou `main`, alteração de banco, deploy Vercel ou adoção no catálogo 7Components sem aceite e ganho validado.

## Decisão de design aprovada

Utilizar o **modelo Equilibrado** para ações individuais de CRUD. O anterior mantinha azul, vermelho e verde fortes o tempo inteiro; isso dava peso excessivo a listas e Kanbans. Novo modelo:

| Ação | Estado normal | Ao passar o mouse |
| --- | --- | --- |
| Visualizar, histórico, consultar | botão branco/neutro, borda e ícone discretos | cores `--accent`/`--accent-soft` da empresa ativa |
| Editar, alterar | botão branco/neutro, ícone de maior contraste | identidade `--accent` da empresa ativa |
| Excluir, revogar, retirar, suspender | botão neutro com ícone `--danger` | fundo `--danger-soft` e borda `--danger` |
| Aprovar, ativar, publicar | botão neutro com ícone `--success` | fundo `--success-soft` e borda `--success` |

Tamanho **40 × 40 px desktop**, **44 × 44 px em dispositivo touch** (`@media (pointer:coarse)`); SVG de 20 × 20 px; raio 12 px; foco de teclado visível; animação reduzida quando preferido. Texto obrigatório via `aria-label` e `title`.

## Alteração já feita no código

1. `app/globals.css`: substituição central de `.cs-icon-action` e variantes `--neutral`, `--edit`, `--danger`, `--success`. Os tons neutros usam tokens de superfície e texto; hover usa whitelabel real, sem azul fixo.
2. `components/ui/icon-action-button.tsx`: componente central **preservado**; o contrato `icon,label,tone,onClick,disabled` é o mesmo. Não atualizar as páginas CRUD para mudar apenas cores.
3. `components/ui/action-icon.tsx`: SVGs existentes mantidos para não gerar regressão de semântica.
4. `tests/unit/ux-icon-global.spec.ts`: critérios de 40 px desktop, 44 px touch, foco, hover contextual e danger.

A UX-ICON-02 já aplica esse componente em Clientes, Projetos, Riscos, Decisões, Documentos, Equipe/stakeholders, Backlog, Kanban de US, Atividades, Memória, Prospect, avaliações, Status Report, empresas, usuários e notificações.

## Atividades para o responsável técnico

- Atualizar somente a branch `work/local-kairos-operacional-20261111` no diretório local do Commander.
- Validar `npm run typecheck`, `npm run lint`, `npm run test:unit` e `npm run build`.
- Inspecionar os ícones em Clientes, Riscos, Backlog, Kanban e Atividades: sem texto visível nas ações individuais, com nome acessível e ícones nítidos.
- Conferir whitelabel em mais de uma empresa: os botões Editar/Visualizar só mudam para a cor da empresa no hover, sem cores codificadas para uma empresa específica.
- Conferir hover, foco por Tab, tamanho em desktop/touch, ícones danger/success, estados disabled e tooltip.
- Confirmar que não houve mudança de handlers, endpoints, permissões ou confirmações de exclusão.
- Verificar telas estreitas e listas densas para evitar truncamento e quebra de layout.
- Registrar evidência visual e resultado mensurável antes de classificar o `IconActionButton` como adotado no catálogo `7Components`.

## Critérios de aceite

- Todos os botões iconográficos utilizam `IconActionButton` e sua paleta comum; não recriar cores ou dimensões diretamente nas telas.
- Ações individuais não competem visualmente com o conteúdo. Delete ainda é reconhecível e confirmado.
- Botões de tarefa principal (Criar, Salvar, Gerar, Publicar em lote) permanecem legíveis com texto.
- Passagem do mouse e navegação por teclado comunicam a ação; mobile tem alvo de toque de 44px.
- Testes técnicos PASS e homologação funcional/visual assinada pelo responsável.

**Atenção:** esta entrega altera a UX, não corrige a autorização de consultas Scrum/Status Report nem a persistência do whitelabel no servidor. Essas frentes são independentes.


## Orientações complementares | Comparação com vitrine de componentes da CNC (11/11/2026)

**Fonte de referência:** https://poc-layout-ti-cnc.vercel.app/ . A comparação foi reportada a partir de inspeção visual das vitrines CNC e 7Components; não representa auditoria de código-fonte da CNC.

### UX-ICON-03: critérios que devem permanecer

- Preservar o modelo Equilibrado, o componente central `IconActionButton` e os SVGs atuais. A CNC é referência de consistência, não um tema a copiar.
- Ações individuais Visualizar/Editar usam base neutra e destaque no hover pela cor da empresa. Excluir/Revogar utilizam semântica danger e confirmação aplicável. Ativar/Aprovar usam success.
- Alvos 40 × 40 px no desktop e 44 × 44 px em touch, SVG 20 × 20 px, `aria-label`, foco visível e sinalização de desabilitado.
- Não substituir ações primárias com texto (Criar, Salvar, Gerar relatório) por ícones isolados; não introduzir cores fixas de uma empresa nem botões ativos que pareçam desabilitados.
- Conferir iconografia e semântica nas telas Clientes, Projetos, Riscos, Decisões, Backlog, Kanban, Atividades, Documentos, usuários, permissões e demais CRUDs. Ações destrutivas exigem confirmação contextual que identifique registro e consequência quando pertinente.

### Oportunidades identificadas na comparação CNC x 7Components (escopo separado de UX-ICON-03)

| Área | Direcionamento para análise futura | Condição de adoção |
| --- | --- | --- |
| Botões e estados | Demonstrar variantes, loading, disabled, icon-only e foco sem duplicar o Button existente | Validar comportamento e legibilidade nos produtos |
| Tabelas e filtros | Demonstração com busca, vazio, somente leitura, paginação, ordenação e filtros avançados recolhíveis | Aplicação real em listagens |
| Campos e seletores | Inputs, combobox com busca/criação contextual e multiseleção; mensagens de erro em português | Permissões e titularidade de cadastro respeitadas |
| Modais | Unificar confirmação nativa/customizada; explicitar nome do registro, consequência e ação irreversível | Confirmar sem regressão do CRUD |
| Abas e drawer | Usar abas com mudanças pendentes; exibir drawers em tamanho adequado no catálogo | Usabilidade comprovada em projeto/ambientes |
| Anexos | FileUpload + FileList com metadados e ações | Regras de segurança e acesso do produto validadas |
| Telas de status e vazio | Casos específicos: convite indisponível, acesso negado, sessão expirada, sem registros, sem resultados | Recuperação e mensagem operacional adequadas |
| LabelValue, cards, badges e metadados | Reutilizar equivalentes atuais antes de criar novos | Evitar duplicação |
| Navegação, notificações e seletor de produto | Avaliar comportamentos com whitelabel e permissões | Produto ativo distinto de empresa ativa |
| Avatar, calendário, períodos | Manter como candidatos, sem adoção antecipada | Demanda comprovada |

**Correções propostas para o catálogo 7Components, sem implementá-las neste ticket:**
1. Uma única demonstração oficial de confirmação, evitando o `window.confirm` nativo quando já existe modal padrão.
2. Uniformização do peso e estilo dos ícones de navegação.
3. Pré-visualizações em tamanho real de drawer, modal, formulário e tabela.
4. Estados funcionais de erro em português, loading, vazio, ausência de permissão e recuperação.

**Ordem sugerida para lote posterior no 7Components:** (1) botões e ações CRUD, (2) ícones e tooltips, (3) campos e seletores, (4) filtros e tabela, (5) anexos, (6) telas de acesso e convite. Esta lista é backlog de avaliação e não autorização de implantação.

### Gates e evidência de aceite

1. Executar `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build` na branch de trabalho. Registrar resultado de cada comando.
2. Homologar visualmente no desktop e touch, com pelo menos duas identidades de empresa, incluindo hover, teclado, contraste, responsividade, textos acessíveis e disabled.
3. Regressão funcional: handlers e endpoints intactos; permissões efetivas no servidor; confirmações de exclusão/revogação preservadas.
4. Registrar capturas antes/depois, telas verificadas, problemas corrigidos e ganho mensurável (por exemplo: percentual das ações CRUD com padrão comum, número de inconsistências e retrabalho eliminado).
5. Não promover a `develop`/`main`, não alterar Supabase e não classificar como **componente adotado no 7Components** sem aceite visual/funcional explícito.

**Escopo:** Esta adição documenta diretrizes e critérios. Não atesta execução de testes nem homologação e não representa autorização para deploy.
