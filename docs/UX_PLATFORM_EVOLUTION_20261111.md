# UX-PLATFORM-01 | Evolução visual e operacional do 7Commander

**Situação:** Proposta de telas de Projeto aprovada pelo responsável em 11/11/2026. Execução em backlog, **não implementada**. Avaliar telas adicionais antes de aprovar o escopo das próximas entregas.

**Branch de trabalho:** `work/local-kairos-operacional-20261111` (base em `develop`). Nenhum merge para develop/main por esta especificação.

## 1. Referência aprovada | DASH-PROJ-01

O protótipo HTML de oito telas do projeto Prosperitá foi aprovado na conversa em 11/11/2026. Regra arquitetural: separar visão de acompanhamento da edição e preservar capacidades existentes. Componentes:

- Visão geral do projeto como entrada padrão; cabeçalho com nome, cliente, fase, status, troca de projeto e Status Report.
- Abas: Visão geral, Projeto, Riscos, Decisões, Documentos, Equipe, Reuniões, Atividades; contadores por aba.
- Saúde do projeto transparente e derivada de dados; indicadores de riscos, decisões e pendências.
- Riscos com severidade, mitigação expansível, vínculos apenas quando existentes, matriz de risco interativa 3x3.
- Equipe agrupada Cliente, Consultoria, Fornecedor, destacando lacunas cadastrais.
- Estado vazio de Decisões com CTA e vinculação ao chat PM/Kairos.
- Documentos recentes com status de processamento, leitura do conteúdo estruturado em painel lateral. Original para download depende da entrega documental Storage separada.
- Formulários operacionais em drawer e edição detalhada na aba Projeto.

### Critérios e cautelas

A proposta aprovada é **referência visual**, não autorização para mudar dados, publicar código ou supor infraestrutura já entregue. A saúde do projeto necessita regra versionada e explicável. Não inferir severidade crítica sem modelo documentado; impacto x probabilidade 3x3 exige normalização consistente e testes.

## 2. Extensão sugerida para outras telas (aguardando avaliação visual)

| ID | Tela | Proposta funcional | Preservar |
| --- | --- | --- | --- |
| UX-HOME-01 | Início | resumo da empresa com projetos, prazos, riscos, decisões pendentes, atividades e atalhos | filtros por organização, alertas reais |
| UX-CLIENT-01 | Clientes | busca, filtros, cards/linhas de cliente, resumo de projetos, detalhe em painel com vínculos e histórico | CRUD e segregação por empresa |
| UX-PROSPECT-01 | Prospect | funil por etapa, tabela/lista alternativa, próximo contato, responsável, conversão para cliente explícita | status, dados e regras existentes |
| UX-SCRUM-01 | Scrum e Sprints | cabeçalho projeto/sprint, progresso, capacidade/pontos, velocidade/risco de prazo, histórico de sprints | ciclo de vida, fechamento de sprint, US |
| UX-BACKLOG-01 | Backlog de US | hierarquia épico/feature/US/task, filtros, prioridade, estimativa, prazo, editor lateral | validações, sprint opcional, bloqueios |
| UX-KANBAN-01 | Kanban de US | fluxo em colunas, WIP, bloqueios, cards compactos, detalhes e comentários em drawer | transições new/ready/active/review/resolved/closed e regras atuais |
| UX-DAILY-01 | Daily | manter tela funcional existente; painel de preparação, pautas, impedimentos e decisões, histórico | execução Daily e seleção de US/atividades já homologadas |
| UX-DECISION-01 | Central de Decisões | lista com assunto, projeto, data/autor, status, fonte, filtros e painel de leitura | Markdown, histórico, original, PDF, publicação/edição |
| UX-REPORT-01 | Status Report | seletor Cliente/Equipe, preview, fontes verificáveis, revisão editorial, exportação PDF | REP-01, consistência de dados, restrições de visibilidade |
| UX-KAIROS-01 | Kairos | contexto sempre visível (empresa/projeto/conversa), evidências, sugestões separadas de ações | não registrar sem autorização; isolamento entre projetos |
| UX-MEMORY-01 | Memória | biblioteca com busca, prioridade, origem e data, revisão/compactação sob comando | escopo e consentimento por usuário/tenant |
| UX-SETTINGS-01 | Configurações | páginas por área (Conta, Organização, Identidade visual, Integrações, Kairos, Diagnóstico) com estados | segredos nunca expostos, papéis e permissões |
| UX-ACT-01 | Atividades operacionais | painel de atrasos, prioridades, responsável, listas/quadros e drawer | operações Kanban, exclusões condicionadas e auditoria |

## 3. Padrões visuais compartilhados

- Cabeçalho de contexto fixo dentro do workspace: organização, projeto ou sprint conforme módulo; nunca duplicar seletores.
- Entrada = leitura, indicadores e prioridades. Formulários somente mediante ação e drawers.
- Tabs para seções e filtros para refinar conteúdo, visualmente distintos.
- Cards KPI com valor, período, definição/fonte; estados vazio, carregando, erro e sem permissão.
- Status/risco com texto acessível e cor de apoio; cores whitelabel por empresa.
- Uma mesma estrutura para dados compartilhados, mas nenhuma fusão indevida entre Cliente e Equipe.
- Responsive e acessibilidade: foco, tabulação, aria-label, contraste; não depender só de cores.
- Contadores derivados da mesma consulta/autorização da listagem para evitar divergências.
- Restrições RLS e UI seguem separadas; não substituir o backend existente apenas para obter o layout.

## 4. Sequenciamento proposto

1. **DASH-PROJ-01**: nova Visão geral + cabeçalho de projeto (protótipo aprovado).
2. **UX-CLIENT-01, UX-HOME-01, UX-ACT-01**: telas gerais e navegação.
3. **UX-SCRUM-01, UX-BACKLOG-01, UX-KANBAN-01, UX-DAILY-01**: fluxo ágil, com Daily preservada.
4. **UX-DECISION-01, UX-REPORT-01, UX-KAIROS-01, UX-MEMORY-01**: governança e inteligência.
5. **UX-PROSPECT-01, UX-SETTINGS-01**: apoio comercial e operacional.

Para cada lote: mockup -> aceite de conteúdo -> implementação na branch local -> testes typecheck/lint/unit/build + fluxos reais permitidos por RLS -> homologação develop -> autorização explícita main. Proteger o estado do Supabase oficial de alterações indevidas.

## 5. Critérios de aceite gerais

- Todas as capacidades já disponíveis em `develop` continuam presentes; não excluir funcionalidades silenciosamente.
- Dados e números reais, sem inventar status, severidade ou métricas de negócio.
- Navegação contextual entre clientes, projetos, sprints, quadro, decisões e relatórios.
- Componentes consistentes com whitelabel e UX de drawers.
- Ações exigem autenticação e autorização no servidor; viewer não escreve.
- Não publicar em produção sem autorização.
