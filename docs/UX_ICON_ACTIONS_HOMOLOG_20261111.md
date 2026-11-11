# UX-ICON-01 | Ações de manutenção padronizadas (proposta em homologação)

**Branch:** `work/local-kairos-operacional-20261111`
**Situação:** UX-ICON-02 implementada transversalmente no código da branch local, **ainda não homologada**. Não registrar como componente adotado na biblioteca oficial até verificação visual, acessibilidade e ganho comprovado.

## Referências fornecidas pelo responsável em 11/11/2026

- Exemplo externo: https://poc-layout-ti-cnc.vercel.app/
- Catálogo interno Consult Services: https://componentesconsultservices.vercel.app/#catalogo
- Captura de referência: três botões quadrados arredondados, contorno, ícone central legível, cores neutro, azul, vermelho e verde.
- Problema observado: botões de editar e excluir na tela Clientes renderizados como ícones minúsculos, quase invisíveis.

## Componente candidato à adoção

- `components/ui/icon-action-button.tsx`: `IconActionButton`, ícone, label obrigatório, tone neutro/edit/danger/success, props nativas de botão.
- `components/ui/action-icon.tsx`: catálogo de ícones de manutenção (eye, pencil, trash, plus, check, star, circle-minus, copy, download, close, refresh).
- `app/globals.css`: `.cs-icon-action`, área clicável **44 × 44 px**, SVG 20 × 20 px, contorno e variação visual conforme finalidade.
- `app/clients/page.tsx`: Visualizar abre drawer em modo consulta, Editar abre formulário existente e Excluir mantém diálogo de confirmação, sem alteração de API ou permissão.
- `tests/unit/ux-homologation-fixes.spec.ts`: verificação estrutural de uso.

## Regras de uso

| Tipo | Ícone e tonalidade | Comportamento |
| --- | --- | --- |
| Visualizar | eye / neutral | abre detalhes, não grava |
| Editar | pencil / edit | abre edição autorizada |
| Excluir | trash / danger | exige confirmação e autorização do servidor |
| Confirmar/ativo | check / success | apenas quando a ação real existir |
| Adicionar | plus / primary ou CTA com texto | criar registro, conforme contexto |

- Nunca incluir botão apenas decorativo.
- Ícones têm nome acessível via `aria-label` e dica via `title`.
- Cor jamais é o único meio de entender a ação.
- O padrão de 44 px mantém clique adequado em telas touch, com foco visível e respeito ao movimento reduzido.
- As ações do domínio de negócio continuam protegidas no backend. Botão visual não concede permissões.

## Aceite pendente

1. Atualizar a branch no localhost.
2. Verificar três ícones nítidos e alinhados na carteira de clientes.
3. Abrir Visualizar e conferir conteúdo de cliente.
4. Editar sem modificar permissões e retornar à lista.
5. Cancelar a exclusão antes de testar qualquer operação destrutiva.
6. Testar responsividade e zoom.
7. Registrar evidência de melhoria antes de promover ao repositório de componentes.

**Escopo seguinte:** após homologação, aplicar em Riscos, Decisões, Equipe e demais grids/listas com CRUD, reutilizando o mesmo componente.

## UX-ICON-02 | Aplicação global em ações CRUD (11/11/2026)

**Implementado no código da branch local:**

- Clientes: visualizar, editar, excluir.
- Projetos: arquivar, excluir, editar riscos e decisões, consultar histórico, visualizar/excluir conhecimento e revogar membro.
- Stakeholders: editar, excluir.
- Backlog: adicionar filho, visualizar, editar, excluir (mantidos bloqueios por histórico e Sprint).
- Kanban de US: visualizar, editar, comentar, alternar leitura/edição.
- Atividades: visualizar/excluir card, editar/excluir comentários, remover etiquetas e membros.
- Memória: fixar, classificar feedback, arquivar obsoleto e editar.
- Prospect e Planejamento: editar registro e atualizar etapa de workflow.
- Decisões: visualizar registro em painel lateral.
- Status Report: publicar, editar e retirar fatos individuais da versão Cliente.
- Avaliações Operacionais: aceitar, rejeitar e solicitar revisão de registro.
- Administração: editar empresa, suspender/reativar empresa e ativar/suspender usuário.
- Notificações Scrum: marcar como lida.
- Kairos: ações primárias de registrar risco e decisão passaram a exibir ícone junto com texto.

**Exceções intencionais e documentadas:**
1. Botões de ação principal, como Criar, Salvar, Gerar PDF, Publicar em lote, Registrar reunião e Iniciar Daily, mantêm **texto** para evitar ambiguidade, com ícone de apoio quando apropriado.
2. Filtros, seletores e transições de status com múltiplas opções permanecem controles `select` ou navegação, pois um ícone isolado não comunica a escolha.
3. Diálogos de confirmação preservam ações escritas `Confirmar` e `Cancelar`. Sua identificação clara é importante principalmente para exclusões.
4. `/activities/overview` é demonstrador sintético, não um fluxo de CRUD do sistema oficial. Não tratá-lo como componente adotado.
5. A biblioteca 7Components oficial somente receberá o componente após homologação do usuário e resultados documentados.

**Testes estáticos adicionados:** `tests/unit/ux-icon-global.spec.ts`. Ainda dependem de execução com `npm run typecheck && npm run lint && npm run test:unit && npm run build`.

**Aceite visual:** verificar no localhost 44×44 px, contraste dos traços, posicionamento e funcionamento dos controles, incluindo responsividade. Confirmar que exclusões em Clientes, Atividades e Projetos não executam sem a confirmação exigida pelo módulo.
