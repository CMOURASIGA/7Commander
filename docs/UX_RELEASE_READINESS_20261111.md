# UX-PLATFORM-01 | Consolidação do código visual

**Branch exclusiva:** `work/local-kairos-operacional-20261111`

**Situação:** implementações de frontend registradas; não homologadas tecnicamente. Sem deploy em develop/main. O código local utiliza dados reais mediante autenticação e RLS. Não interpretar implementação como garantia de teste PASS.

## Inventário de UX aplicado

| Tela real | Entrega funcional na branch | Observação |
| --- | --- | --- |
| Início `/` | Introdução contextual, indicadores já existentes, atalhos operacionais e acesso a Decisões | preservar dados e regras de alerta |
| Projetos `/projects` | Visão geral como entrada padrão, cabeçalho contextual, troca de projeto, abas com contadores, indicadores, resumo de Riscos, matriz 3x3, agrupamento de stakeholders, decisões e documentos recentes | cálculo de risco não representa saúde global do cronograma |
| Riscos/Decisões no projeto | preservar drawer de CRUD, lista e filtros existentes e novos blocos resumidos | validar gravações e RLS; não excluir registros reais |
| Documentos no projeto | lista compacta de conteúdo ingerido, status Processado e painel lateral de leitura | upload é ingestão de conhecimento; Storage de original NÃO entregue |
| Clientes `/clients` | busca, status, CTA novo cliente, formulário lateral para criar/editar | CRUD preexistente preservado |
| Prospect `/planning` | listagem como principal, novo/editar via drawer, etapa, responsável e próxima ação nos registros | etapas, aprovações, histórico e vínculos mantidos |
| Scrum `/scrum` | navegação uniforme, contexto e métricas existentes | não alterar estado de Sprints |
| Backlog `/scrum/backlog` | navegação uniforme, hierarquia, filtros e drawer existentes preservados | respeitar bloqueio de sprint fechada |
| Kanban de US `/scrum/kanban` | navegação uniforme, US/Tasks, KPIs, comentários e transições existentes | justificativa REVIEW continua obrigatória |
| Daily `/daily` | navegação de gestão ágil com fluxo homologado preservado | não substituir por layout que remove seleções |
| Atividades `/activities` | navegação comum, KPIs reais de execução, atraso e atribuição; retirado banner sintético | manter Kanban operacional e comentários |
| Decisões de projetos `/decisions` | central de consulta, filtros, indicadores, detalhe lateral e acesso a edição no projeto | usa `/api/decisions` e não substitui Avaliações Operacionais |
| Avaliações operacionais `/operational-decisions` | título/navegação distintos da central de decisões de projetos | fluxo JEV consultivo permanece independente |
| Status Report `/status-report` | seleção de público Cliente/Equipe com descrição do escopo | REP-01 e regras de visibilidade não foram alteradas |
| Kairos `/chat` | contexto explícito da conversa, vínculo com projeto e atalhos | núcleo e operações existentes preservados |
| Memória `/memory` | pesquisa textual, filtro P0-P4, contadores e ações anteriores | prioridades/compactação já existentes |
| Configurações `/settings` | navegação por âncoras Identidade, Kairos, Frontend, Backend, Integrações, Voz, Acesso | nenhum segredo exposto |

## Padrão de UI aplicado

1. Leitura contextual antes do CRUD.
2. Barra de navegação do mesmo processo nas telas Scrum/Backlog/Kanban/Daily/Atividades.
3. Formulários em drawer nas áreas de Projeto, Clientes, Prospect e consulta lateral de decisão/documento.
4. Manter estados de carregando, erro e falta de dados; não substituir ausência por zero verificado.
5. Sem novas migrations, permissões, mutações Supabase, endpoints externos ou migração de dados nesta entrega UX.

## Restrições antes de encerrar/homologar

- Executar `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build` no computador local. São necessários; nenhum resultado PASS foi observado nesta sessão.
- Conferir todas as rotas e breakpoint mobile/desktop. Revisar modais/drawers, foco, contraste e atualização após CRUD.
- Validar RLS para admin/editor/viewer. Especialmente salvar/editar Projeto, Riscos e Decisões, Prospect, Cliente e status Scrum.
- Confirmar que indicadores e contadores estão sincronizados com os dados autorizados e sem duplicação ao trocar empresa.
- Garantir que o usuário consegue diferenciar Decisões de Projeto de Avaliações consultivas.
- **Storage documental não pertence ao fechamento visual:** DOC-PROJ-01 precisa de desenho e implementação de anexo original, download seguro e análise opcional. Não considerar o upload atual como armazenamento original.

## Sequência após gates locais

Revisão dos defeitos encontrados -> homologação local -> PR para `develop` -> preview Vercel -> autorização explícita `main`.

Após UX, retomar pendências funcionais: DOC-PROJ-01 Storage, KAIROS-CORE-01 operações e rastreabilidade, relatórios REP-01 e autorizações/API multiempresa. Separar evidências de UX e regras de backend.

## Comandos

```powershell
cd C:\Projetos\7Commander-local
git pull --ff-only origin work/local-kairos-operacional-20261111
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run dev -- --hostname localhost --port 3100
```

**Aviso:** Supabase oficial é compartilhado. Evitar exclusão de informações reais durante a homologação.
