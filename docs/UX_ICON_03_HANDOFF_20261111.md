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
