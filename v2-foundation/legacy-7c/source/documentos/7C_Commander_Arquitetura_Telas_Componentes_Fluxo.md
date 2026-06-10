# 7C Commander - Arquitetura de Telas, Componentes e Fluxo de Navegação

## Objetivo deste documento

Este documento descreve a arquitetura visual e funcional do frontend do **7C Commander**, considerando a base já iniciada no projeto atual e a evolução necessária para transformá-lo em uma plataforma de gestão de projetos com apoio inteligente por cenário.

O foco aqui é detalhar:

- telas
- navegação
- componentes
- blocos visuais
- comportamento das abas
- fluxo do usuário
- previews e visualização de artefatos
- experiência de uso

Este documento complementa o backlog funcional e as fases de desenvolvimento já definidas.

---

# 1. Direção de UX do produto

## Visão geral
O 7C Commander deve ter uma experiência de uso:

- clara
- prática
- orientada por projeto
- pouco poluída
- com cara de produto corporativo premium
- fácil para usuários que não conhecem profundamente IA

## Regra principal de UX
O usuário não deve pensar primeiro em agente.
Ele deve pensar primeiro em:

- cliente
- projeto
- objetivo
- artefato
- ação desejada

O agente entra como apoio contextual dentro do projeto.

## Princípios de interface
- foco em leitura clara
- pouco ruído visual
- navegação consistente
- cards com propósito
- hierarquia visual forte
- área de trabalho central
- ações importantes sempre visíveis
- preview sempre que possível

---

# 2. Mapa de navegação principal

## Menu lateral principal
O menu lateral deve conter:

1. Início
2. Clientes
3. Projetos
4. Artefatos
5. Agentes
6. Ajuda
7. Configurações

## Regra de navegação
A navegação principal deve levar o usuário a:

**Projeto > Workspace > Agente / Artefato**

e não para um laboratório genérico.

---

# 3. Estrutura de páginas

## 3.1. Página de Login

### Objetivo
Permitir entrada com conta Google.

### Componentes
- logo do 7C Commander
- título do sistema
- subtítulo curto
- botão “Entrar com Google”
- mensagem de apoio
- rodapé simples

### Comportamento
- se autenticado, redirecionar para Início
- se não autenticado, manter somente esta tela acessível

---

## 3.2. Página Início

### Objetivo
Mostrar visão resumida da plataforma.

### Blocos recomendados
- boas-vindas
- projetos recentes
- projetos em atenção
- artefatos recentes
- atalhos rápidos
- agentes disponíveis
- status do sistema

### Componentes
- cards de projeto
- tabela curta de atividade recente
- botões rápidos
- indicadores simples

### Ações principais
- criar cliente
- criar projeto
- abrir projeto recente
- abrir agente a partir de um projeto

---

## 3.3. Página Clientes

### Objetivo
Permitir gestão de clientes.

### Componentes
- tabela/lista de clientes
- busca
- filtro
- botão “Novo cliente”
- card ou modal de edição

### Campos mínimos
- nome
- descrição
- responsável
- observações
- quantidade de projetos vinculados

### Ações
- criar
- editar
- abrir projetos do cliente

---

## 3.4. Página Projetos

### Objetivo
Ser o principal catálogo operacional dos projetos.

### Componentes
- busca
- filtros
- cards ou tabela de projetos
- botão “Novo projeto”
- indicadores por status
- link para workspace do projeto

### Dados visíveis no card/tabela
- nome do projeto
- cliente
- status
- fase
- saúde
- responsável
- última atualização
- próximo passo

### Ações
- abrir projeto
- editar projeto
- visualizar artefatos recentes
- acessar agentes do projeto

---

# 4. Workspace do Projeto

## Objetivo
Ser a principal área de trabalho do sistema.

## Estrutura da tela
A tela do projeto deve ter:

- cabeçalho do projeto
- breadcrumb
- resumo do projeto
- abas centrais
- área de artefatos
- ações rápidas

## Cabeçalho do projeto
### Deve mostrar
- nome do projeto
- cliente
- status
- fase
- saúde
- responsável
- última atualização

### Botões
- editar projeto
- compartilhar
- abrir pasta no Drive
- atualizar dados

---

## 4.1. Abas do Workspace do Projeto

### Abas obrigatórias
1. Visão Geral
2. Contexto
3. Agentes
4. Artefatos
5. Histórico
6. Compartilhamento

---

## 4.2. Aba Visão Geral

### Objetivo
Mostrar a leitura resumida do projeto.

### Blocos recomendados
- objetivo do projeto
- descrição resumida
- metodologia
- status geral
- fase atual
- próximos passos
- riscos em destaque
- decisões pendentes
- artefatos recentes

### Componentes
- cards
- caixas de resumo
- lista curta de ações
- badge de status

---

## 4.3. Aba Contexto

### Objetivo
Concentrar a base do projeto.

### Conteúdo esperado
- objetivo
- problema ou oportunidade
- valor esperado
- stakeholders
- restrições
- dependências
- premissas
- riscos principais

### Componentes
- blocos de leitura
- botão editar
- botão sincronizar com planilha mestre, se aplicável

---

## 4.4. Aba Agentes

### Objetivo
Mostrar os agentes disponíveis para aquele projeto.

### Layout recomendado
Cards grandes, organizados em grade.

### Cada card deve mostrar
- nome do agente
- descrição curta
- quando usar
- tipo de entrada
- tipo de saída
- botão “Abrir agente”
- botão “Ver artefatos do agente”

### Agentes obrigatórios
- Storyboard Intelligence Architect
- PM AI Partner
- BPMN Master Architect
- Status Report Executive Architect

### Ações por card
- abrir agente externo
- copiar contexto do projeto
- ver instrução de uso
- ver artefatos já criados

---

## 4.5. Aba Artefatos

### Objetivo
Ser a biblioteca central do projeto.

### Filtros recomendados
- todos
- contexto
- SAI
- PM
- BPMN
- Status
- outros

### Informações por artefato
- nome
- tipo
- agente
- data
- última atualização
- formato
- link

### Ações
- visualizar
- abrir no Google
- baixar
- atualizar
- gerar nova versão

### Visualização
O preview deve variar por tipo:
- Google Doc: preview simples + abrir no Google
- HTML: preview interno
- imagem BPMN: preview visual
- `.bpmn`: botão abrir/baixar
- Markdown: preview textual

---

## 4.6. Aba Histórico

### Objetivo
Mostrar rastreabilidade do projeto.

### Deve exibir
- criação do projeto
- edição de dados
- artefatos gerados
- artefatos atualizados
- agente usado
- data e hora
- autor da ação

### Componentes
- timeline
- filtros por tipo de evento
- ícones por evento

---

## 4.7. Aba Compartilhamento

### Objetivo
Permitir gestão de acesso ao projeto.

### Componentes
- lista de pessoas com acesso
- campo para adicionar e-mail Google
- nível de acesso
- botão compartilhar
- botão remover acesso

### Informações visíveis
- nome ou e-mail
- papel
- data de concessão

---

# 5. Páginas e componentes dos agentes

Os agentes não devem parecer páginas soltas.
Eles devem ter uma estrutura padronizada.

## Layout padrão da página do agente
- cabeçalho do agente
- nome do projeto
- objetivo da aba
- instruções rápidas
- área de contexto
- área de entrada
- ações
- lista de artefatos do agente
- preview do artefato selecionado

---

## 5.1. Tela do Storyboard Intelligence Architect

### Objetivo
Ajudar a organizar contexto bruto.

### Componentes
- caixa de texto grande
- upload de arquivo
- painel “como usar”
- botão abrir agente
- botão copiar contexto
- lista de documentos do SAI
- preview do documento

### Tipos de artefato
- storyboard inicial
- storyboard validado
- leitura inicial
- contexto consolidado

---

## 5.2. Tela do PM AI Partner

### Objetivo
Estruturar a gestão do projeto.

### Componentes
- resumo do projeto
- texto base
- ação para abrir agente
- botão copiar contexto
- bloco com objetivos e restrições
- artefatos PM
- preview do documento PM

### Tipos de artefato
- diagnóstico
- plano
- backlog
- leitura executiva
- tailoring
- estrutura para Trello

---

## 5.3. Tela do BPMN Master Architect

### Objetivo
Trabalhar processo e modelagem BPMN.

### Componentes
- descrição do processo
- botão abrir agente
- botão copiar contexto
- tabela de arquivos BPMN
- preview de imagem BPMN
- seção de comentários
- links para arquivos `.bpmn`

### Tipos de artefato
- AS IS `.bpmn`
- TO BE `.bpmn`
- imagem AS IS
- imagem TO BE
- análise do processo

### Regra visual
A imagem do BPMN deve sempre ter área de preview dedicada.

---

## 5.4. Tela do Status Report Executive Architect

### Objetivo
Montar report executivo e dashboard.

### Componentes
- resumo do projeto
- período de referência
- botão abrir agente
- botão copiar contexto
- lista de status reports
- preview HTML
- lista de apresentações
- botão abrir HTML em nova aba

### Tipos de artefato
- markdown do status report
- dashboard HTML
- apresentação HTML

### Regra visual
O preview HTML deve ser elemento central desta tela.

---

# 6. Componentes principais do frontend

## 6.1. AppShell
Componente estrutural com:
- menu lateral
- topo
- breadcrumb
- área central
- rodapé opcional

## 6.2. ProjectHeader
Componente com:
- nome do projeto
- cliente
- status
- fase
- saúde
- botões rápidos

## 6.3. AgentCard
Componente para exibir um agente.

### Deve conter
- ícone
- nome
- descrição
- momento de uso
- botão abrir
- botão ver artefatos

## 6.4. ArtifactList
Lista padrão de artefatos.

### Deve suportar
- filtro
- ordenação
- preview
- ações por item

## 6.5. HtmlPreviewPanel
Preview interno de arquivos HTML.

### Deve suportar
- iframe controlado
- abrir em nova aba
- atualizar preview

## 6.6. BpmnPreviewPanel
Preview de imagem do BPMN.

### Deve suportar
- zoom simples
- abrir imagem em tamanho maior
- metadados do arquivo

## 6.7. ContextPanel
Painel lateral ou superior com:
- objetivo do projeto
- resumo
- próximos passos
- contexto mínimo

## 6.8. QuickActionsBar
Barra com:
- abrir agente
- copiar contexto
- salvar artefato
- abrir pasta do Drive
- compartilhar

## 6.9. ProjectForm
Formulário padrão de projeto.

## 6.10. ClientForm
Formulário padrão de cliente.

## 6.11. ShareProjectModal
Modal para compartilhamento.

## 6.12. SettingsPanel
Painel para:
- links dos agentes
- logo
- variáveis
- flags

---

# 7. Fluxo ideal do usuário

## Fluxo 1 - Criar projeto
1. usuário loga
2. acessa Clientes ou Projetos
3. cria cliente, se necessário
4. cria projeto
5. sistema cria estrutura no Drive
6. sistema registra na planilha mestre
7. usuário entra no workspace

## Fluxo 2 - Usar agente
1. usuário entra no projeto
2. abre aba Agentes
3. escolhe agente
4. copia contexto ou abre o link
5. produz o conteúdo
6. salva artefato
7. artefato aparece na biblioteca do projeto

## Fluxo 3 - Visualizar artefato
1. usuário entra no projeto
2. abre aba Artefatos ou aba do agente
3. seleciona artefato
4. sistema mostra preview
5. usuário abre no Google, baixa ou atualiza

## Fluxo 4 - Atualizar Status HTML
1. usuário abre aba Status
2. seleciona dashboard HTML
3. visualiza no preview
4. atualiza com apoio da IA
5. salva a nova versão
6. preview é atualizado

---

# 8. Regras de comportamento visual

## Dashboard geral
- limpo
- sem excesso de widgets
- foco em projetos e ações

## Workspace do projeto
- ser a tela mais forte do sistema
- foco em contexto, agentes e artefatos

## Agentes
- cards claros
- orientação prática
- sem visual de laboratório

## Artefatos
- listagem clara
- preview forte
- navegação simples

## Status HTML
- preview elegante
- leitura visual executiva
- espaço suficiente

## BPMN
- preview visual
- botão de acesso ao `.bpmn`
- distinção entre imagem e arquivo técnico

---

# 9. Responsividade

## Em desktop
- menu lateral fixo
- workspace com duas colunas quando fizer sentido
- preview ao lado da lista

## Em tablet
- menu recolhível
- cards em duas colunas
- preview abaixo

## Em mobile
- foco em consulta e acesso rápido
- edição reduzida
- cards em uma coluna
- previews simplificados

---

# 10. Recomendação de implementação por componente

## Prioridade alta
- AppShell
- ProjectHeader
- ProjectForm
- ClientForm
- AgentCard
- ArtifactList
- ContextPanel
- QuickActionsBar

## Prioridade média
- HtmlPreviewPanel
- BpmnPreviewPanel
- ShareProjectModal
- SettingsPanel

## Prioridade futura
- editor interno de HTML
- editor interno de Markdown
- autosave
- timeline avançada
- versionamento visual

---

# 11. Diretriz final para o dev

O frontend do 7C Commander não deve ser construído como um painel genérico de ferramentas.
Ele deve ser construído como uma **plataforma de trabalho por projeto**, com:

- entrada simples
- contexto claro
- agentes acessados no momento certo
- artefatos visíveis
- visualização útil
- experiência consistente

A tela mais importante do sistema é o **Workspace do Projeto**.
Toda a arquitetura visual deve convergir para ele.

---

# 12. Resultado esperado

Ao final da implementação visual e funcional do frontend, o usuário deve sentir que:

- está dentro de um sistema de gestão real
- entende facilmente onde está
- sabe qual agente usar
- encontra os documentos do projeto
- consegue visualizar artefatos sem esforço
- percebe valor prático no uso diário
- consegue colaborar com outras pessoas no mesmo projeto