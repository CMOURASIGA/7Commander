# 7C Commander - Plano de Desenvolvimento por Fases

## Visão do produto

O **7C Commander** será uma plataforma web única para gestão de projetos com apoio inteligente por cenário.

A aplicação nasce como um **sistema de gestão de projetos** e, por cima dele, oferece acesso contextual aos agentes especializados:

- **Storyboard Intelligence Architect**
- **PM AI Partner**
- **BPMN Master Architect**
- **Status Report Executive Architect**

A primeira versão deve seguir a lógica do **MVP baseado em projeto**, com:
- autenticação Google
- organização por cliente e projeto
- estrutura de pastas no Google Drive
- planilha mestre de projetos no Google Sheets
- documentos por agente
- visualização de artefatos dentro da ferramenta
- integração inicial por links dos agentes
- preparação arquitetural para futura migração para APIs de IA

---

# 1. Base atual identificada no projeto existente

A base atual já possui elementos importantes que devem ser reaproveitados:

## Stack atual
- React
- Vite
- TypeScript
- Tailwind CSS
- Zustand
- React Router
- xlsx
- estrutura de páginas e serviços já iniciada

## Estrutura atual relevante
- `Dashboard`
- `Projects`
- `ProjectWorkspace`
- `AgentsLab`
- `Settings`
- `Help`

## Stores já existentes
- `useProjectsStore`
- `useChatStore`
- `useSettingsStore`
- `useThemeStore`

## Serviços já iniciados
- `projectService`
- `documentService`
- `contextService`
- `aiService`
- `imageService`

## Direção de evolução
A base atual deve ser refatorada para deixar de ser apenas um cockpit genérico e passar a operar como plataforma orientada por projeto, cliente, agente e artefato.

---

# 2. Princípios do MVP

## O sistema deve nascer orientado por projeto
O fluxo principal deve ser:

**Login > Cliente > Projeto > Agente > Artefatos**

## A IA não é o sistema
A IA será uma camada de apoio dentro do sistema.

## O projeto é a unidade central
Tudo precisa estar vinculado a um projeto:
- contexto
- arquivos
- agentes usados
- artefatos
- histórico

## O Google Workspace será o armazenamento inicial
Usar:
- Google Login
- Google Drive
- Google Docs
- Google Sheets

## Formato padrão dos artefatos
- Markdown para geração inicial
- Google Docs para documentos de leitura e edição
- `.bpmn` e imagem para processos
- `.html` para dashboards visuais
- Google Sheets como índice mestre

---

# 3. Estrutura alvo do Google Drive

```text
7C Commander
  00_Controle_Projetos
    Projetos_Master.gsheet
  Cliente_A
    Projeto_X
      01_Contexto
      02_SAI
      03_PM
      04_BPMN
      05_Status
      06_Artefatos_Gerais
  Cliente_B
    Projeto_Y
      01_Contexto
      02_SAI
      03_PM
      04_BPMN
      05_Status
      06_Artefatos_Gerais
```

## Observações
- cada cliente pode ter vários projetos
- cada projeto tem subpastas por agente
- cada artefato salvo deve carregar vínculo com projeto, cliente, agente e data
- a planilha mestre deve servir como índice principal do sistema

---

# 4. Variáveis e configurações obrigatórias

## Variáveis de ambiente do frontend
```env
VITE_APP_NAME=7C Commander
VITE_APP_ENV=development
VITE_WEBAPP_BASE_URL=https://seu-dominio-ou-host
VITE_GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID
VITE_GOOGLE_API_KEY=SUA_GOOGLE_API_KEY
VITE_GOOGLE_DRIVE_ROOT_FOLDER_NAME=7C Commander
VITE_GOOGLE_PROJECTS_SHEET_NAME=Projetos_Master
VITE_IMGR_BRAND_LOGO_URL=https://i.imgur.com/GUOMwkI.png
VITE_AGENT_SAI_URL=https://chatgpt.com/g/gpt-link-sai
VITE_AGENT_PM_URL=https://chatgpt.com/g/gpt-link-pm
VITE_AGENT_BPMN_URL=https://chatgpt.com/g/gpt-link-bpmn
VITE_AGENT_STATUS_URL=https://chatgpt.com/g/gpt-link-status
VITE_ENABLE_EXTERNAL_AGENT_LINKS=true
VITE_ENABLE_INTERNAL_HTML_PREVIEW=true
VITE_ENABLE_GOOGLE_DOC_PREVIEW=true
VITE_ENABLE_BPMN_IMAGE_PREVIEW=true
```

## Variáveis futuras para opção 2
```env
VITE_ENABLE_INTERNAL_AI=false
VITE_AI_PROVIDER=openai
VITE_OPENAI_MODEL=
VITE_OPENAI_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Regras de uso
- links dos agentes devem ser configuráveis por variável
- logo e identidade visual devem ser configuráveis
- URL base do sistema deve ser configurável
- root folder do Drive deve ser configurável
- nome da planilha mestre deve ser configurável

---

# 5. Estrutura funcional do produto

## Módulos do sistema
1. Login
2. Dashboard
3. Gestão de Clientes
4. Gestão de Projetos
5. Workspace do Projeto
6. Agentes
7. Artefatos
8. Histórico
9. Configurações
10. Ajuda

## Workspace do projeto
Cada projeto deve ter abas como:
- Visão Geral
- Contexto
- Agentes
- Artefatos
- Histórico
- Compartilhamento

## Abas dos agentes
### SAI
- contexto bruto
- storyboard
- documentos gerados

### PM
- diagnóstico
- plano
- backlog
- roadmap
- documentos gerados

### BPMN
- arquivos `.bpmn`
- imagem `.png` ou `.svg`
- preview da imagem
- comentários e análise

### Status
- markdown do report
- html do dashboard
- html da apresentação
- preview interno

---

# 6. Fases de desenvolvimento

---

# FASE 1 - Reestruturação da base e identidade do 7C Commander

## Objetivo da fase
Transformar a base atual em uma plataforma orientada por projeto e alinhada à identidade do 7C Commander.

## Entregas da fase
- renomeação visual e conceitual do app
- reorganização da navegação
- revisão do layout principal
- preparação das entidades Cliente, Projeto, Agente e Artefato
- remoção do foco em cockpit genérico
- fortalecimento da visão por projeto

---

## US-01 - Reposicionar a identidade visual e textual do sistema
**Como** usuário  
**Quero** ver a plataforma com identidade clara do 7C Commander  
**Para** entender que estou usando uma solução única e organizada

### Critérios de aceite
- o nome do produto deve aparecer como 7C Commander
- a logo deve ser carregada por variável
- o menu e as telas devem refletir a nova identidade
- textos antigos que remetam ao cockpit genérico devem ser revisados

### O que o dev precisa fazer
- revisar `App.tsx`, `Layout.tsx`, `Login.tsx`, `Dashboard.tsx`
- substituir textos e títulos do projeto anterior
- parametrizar logo principal por variável
- ajustar meta title do app
- revisar `README.md` e `metadata.json`

---

## US-02 - Reorganizar a navegação principal por projeto
**Como** usuário  
**Quero** navegar por clientes e projetos  
**Para** acessar os agentes dentro do contexto certo

### Critérios de aceite
- o menu deve conter acesso claro a clientes, projetos, agentes, artefatos e ajuda
- a tela de projetos deve ser central
- a tela do projeto deve ser a principal unidade de trabalho
- AgentsLab não deve ser a navegação principal do produto

### O que o dev precisa fazer
- reestruturar rotas
- revisar `Projects.tsx`, `ProjectWorkspace.tsx`, `AgentsLab.tsx`
- adaptar menu lateral e breadcrumbs
- criar fluxo de entrada via projeto

---

## US-03 - Ajustar os tipos e stores para suportar cliente, projeto e artefato
**Como** sistema  
**Quero** entidades coerentes  
**Para** armazenar e exibir os dados corretamente

### Critérios de aceite
- deve existir entidade de cliente
- projeto deve suportar vínculo com cliente
- artefato deve suportar tipo, agente, projeto, data e link
- histórico deve poder registrar ação por agente

### O que o dev precisa fazer
- refatorar `types.ts`
- revisar `useProjectsStore`
- criar tipagem para `Client`, `Artifact`, `AgentLinkConfig`, `DriveFolderRef`
- preparar estrutura para integração com Google

---

# FASE 2 - Cadastro de clientes e projetos

## Objetivo da fase
Permitir criação e gestão de clientes e projetos dentro da interface.

## Entregas da fase
- cadastro de cliente
- cadastro de projeto
- edição de projeto
- visualização de status do projeto
- base local funcionando mesmo antes da integração Google

---

## US-04 - Criar cadastro de clientes
**Como** usuário  
**Quero** cadastrar clientes  
**Para** organizar projetos por cliente

### Critérios de aceite
- devo conseguir criar cliente com nome e dados básicos
- devo conseguir editar cliente
- devo conseguir listar clientes
- cada cliente deve poder conter vários projetos

### O que o dev precisa fazer
- criar tela e store de clientes
- ajustar rotas e tipagens
- criar componente de formulário reutilizável

---

## US-05 - Criar cadastro de projeto com campos mínimos
**Como** usuário  
**Quero** criar um projeto completo  
**Para** ter base de gestão já no sistema

### Campos mínimos do projeto
- nome do projeto
- cliente
- objetivo
- descrição
- responsável
- metodologia
- status
- data de início
- data final prevista
- stakeholders
- próximo passo
- fase
- saúde do projeto

### Critérios de aceite
- devo conseguir criar projeto com esses campos
- devo conseguir editar o projeto
- devo ver o projeto na listagem
- devo entrar no workspace do projeto

### O que o dev precisa fazer
- revisar `Projects.tsx`
- ampliar store e serviço de projeto
- montar formulário de projeto
- preparar persistência local para MVP inicial

---

## US-06 - Exibir visão geral do projeto no workspace
**Como** usuário  
**Quero** ver um resumo do projeto ao entrar  
**Para** entender rapidamente em que contexto estou trabalhando

### Critérios de aceite
- o workspace deve mostrar dados principais do projeto
- deve mostrar cliente, status, objetivo e fase
- deve mostrar atalhos para os agentes
- deve mostrar artefatos recentes

### O que o dev precisa fazer
- refatorar `ProjectWorkspace.tsx`
- criar cards de resumo
- criar sessão de artefatos recentes
- criar sessão de ações rápidas

---

# FASE 3 - Integração Google Login e estrutura no Google Drive

## Objetivo da fase
Autenticar com Google e criar a base de armazenamento no Google Workspace.

## Entregas da fase
- login com Google
- criação/identificação da pasta raiz 7C Commander
- criação da planilha mestre
- criação de pastas por cliente e projeto
- compartilhamento futuro preparado

---

## US-07 - Implementar login com Google
**Como** colaborador  
**Quero** entrar com minha conta Google  
**Para** acessar os projetos e usar o Drive como base de armazenamento

### Critérios de aceite
- devo conseguir autenticar com Google
- o sistema deve identificar minha conta
- o sistema deve bloquear acesso sem login válido
- a sessão deve ser mantida conforme política definida

### O que o dev precisa fazer
- integrar Google OAuth
- substituir login fake atual
- revisar `Login.tsx`
- criar serviço de autenticação Google
- tratar erros de autenticação

---

## US-08 - Criar ou localizar a pasta raiz 7C Commander no Drive
**Como** sistema  
**Quero** encontrar ou criar a pasta raiz  
**Para** armazenar todos os projetos da plataforma

### Critérios de aceite
- se a pasta 7C Commander não existir, ela deve ser criada
- se já existir, deve ser reutilizada
- o ID da pasta deve ser guardado para a sessão

### O que o dev precisa fazer
- criar `googleDriveService`
- criar função `ensureRootFolder`
- parametrizar nome da pasta por variável

---

## US-09 - Criar ou localizar a planilha mestre de projetos
**Como** sistema  
**Quero** usar uma planilha mestre  
**Para** indexar todos os projetos

### Critérios de aceite
- a planilha mestre deve existir dentro de `00_Controle_Projetos`
- deve conter cabeçalho padrão
- deve ser lida na abertura do sistema
- projetos criados devem ser refletidos nessa planilha

### Estrutura mínima da planilha
- ID_Projeto
- Cliente
- Nome_Projeto
- Objetivo
- Status
- Responsável
- Data_Criação
- Última_Atualização
- Metodologia
- Fase
- Saúde
- Próximo_Passo
- Link_Pasta_Projeto

### O que o dev precisa fazer
- criar serviço Google Sheets
- criar função `ensureProjectsMasterSheet`
- criar leitura e escrita da planilha
- remover dependência primária de `xlsx` local para este controle

---

## US-10 - Criar estrutura de pastas por cliente e projeto
**Como** sistema  
**Quero** criar automaticamente a estrutura do projeto no Drive  
**Para** manter os artefatos organizados

### Critérios de aceite
- ao criar projeto, deve ser criada a pasta do cliente, se não existir
- deve ser criada a pasta do projeto
- devem ser criadas as subpastas padrão
- os links das pastas devem ser registrados

### Subpastas obrigatórias
- 01_Contexto
- 02_SAI
- 03_PM
- 04_BPMN
- 05_Status
- 06_Artefatos_Gerais

### O que o dev precisa fazer
- criar função `ensureClientFolder`
- criar função `ensureProjectFolder`
- criar função `ensureStandardSubfolders`
- persistir IDs e links das pastas no projeto e/ou planilha mestre

---

# FASE 4 - Central de agentes e integração por link

## Objetivo da fase
Permitir uso inicial dos agentes externos dentro do contexto do projeto.

## Entregas da fase
- cadastro dos links dos agentes por variável
- cards dos agentes por projeto
- botão de abertura do agente correspondente
- orientação contextual por agente
- fluxo manual inteligente de ida e volta

---

## US-11 - Exibir agentes disponíveis dentro do projeto
**Como** usuário  
**Quero** ver os agentes dentro do projeto  
**Para** usar cada um no momento certo

### Critérios de aceite
- o workspace deve mostrar os 4 agentes principais
- cada agente deve mostrar descrição curta
- cada agente deve mostrar quando usar
- cada agente deve ter botão de ação

### O que o dev precisa fazer
- revisar `AgentsLab.tsx`
- mover a lógica para dentro do projeto
- criar cards por agente
- carregar links via variável

---

## US-12 - Abrir o link do agente correspondente com contexto do projeto
**Como** usuário  
**Quero** acessar o agente correto  
**Para** trabalhar com o contexto do projeto certo

### Critérios de aceite
- cada botão deve abrir o link configurado do agente
- o sistema deve mostrar ao usuário qual contexto levar
- deve existir orientação de “copiar contexto” quando necessário
- deve ficar claro qual agente está sendo aberto

### O que o dev precisa fazer
- criar componente de launcher dos agentes
- usar as variáveis `VITE_AGENT_*_URL`
- criar área de contexto pronto para copiar
- exibir dicas de uso por agente

---

# FASE 5 - Artefatos por agente e persistência em Google Docs / arquivos

## Objetivo da fase
Permitir salvar e visualizar artefatos produzidos por cada agente.

## Entregas da fase
- criação de artefatos
- registro de artefatos por projeto
- visualização de artefatos por aba do agente
- abertura no Drive/Docs
- atualização sem perda

---

## US-13 - Salvar artefatos de texto como Google Docs
**Como** usuário  
**Quero** salvar a saída dos agentes em documentos  
**Para** manter histórico e edição futura

### Critérios de aceite
- devo conseguir salvar um conteúdo em Google Doc
- o doc deve ser salvo na pasta correta do agente
- o doc deve aparecer na lista de artefatos do projeto
- o link do documento deve ficar registrado

### O que o dev precisa fazer
- criar integração com Google Docs API ou estratégia de criação de arquivo no Drive
- criar modelagem de artefato
- adaptar `documentService`
- criar lista de documentos por agente

---

## US-14 - Visualizar documentos do agente dentro da ferramenta
**Como** usuário  
**Quero** visualizar os documentos salvos  
**Para** não depender de abrir tudo fora da plataforma

### Critérios de aceite
- devo ver lista de documentos por aba do agente
- devo conseguir abrir o link do documento
- devo conseguir visualizar preview básico quando habilitado
- o sistema deve mostrar data da última atualização

### O que o dev precisa fazer
- criar componente de lista de artefatos
- criar preview simples
- exibir link externo do Google Doc
- suportar filtros por agente

---

## US-15 - Atualizar artefatos sem perder conteúdo
**Como** usuário  
**Quero** atualizar um documento existente  
**Para** manter o trabalho salvo e evolutivo

### Critérios de aceite
- devo conseguir atualizar um artefato existente
- a atualização deve refletir no arquivo salvo
- deve existir data/hora da última alteração
- deve ser possível salvar nova versão se necessário

### O que o dev precisa fazer
- criar ação de update no documento
- definir estratégia de overwrite vs nova versão
- registrar metadados de atualização

---

# FASE 6 - BPMN: arquivo, imagem e visualização

## Objetivo da fase
Tratar o BPMN como artefato técnico e visual.

## Entregas da fase
- salvar `.bpmn`
- salvar imagem `.png` ou `.svg`
- visualizar imagem no app
- listar arquivos BPMN do projeto

---

## US-16 - Salvar arquivo BPMN
**Como** usuário  
**Quero** salvar o arquivo `.bpmn`  
**Para** reutilizar em modelagem e importação no Bizagi

### Critérios de aceite
- devo conseguir salvar arquivo `.bpmn` na pasta 04_BPMN
- o arquivo deve aparecer na lista do projeto
- deve ser possível baixar ou abrir

### O que o dev precisa fazer
- criar rotina de upload/salvamento de `.bpmn`
- registrar artefato do tipo BPMN_FILE
- exibir na aba BPMN

---

## US-17 - Salvar imagem do BPMN
**Como** usuário  
**Quero** salvar a imagem do BPMN  
**Para** usar em leitura rápida, reunião e documentação

### Critérios de aceite
- devo conseguir salvar `.png` ou `.svg`
- a imagem deve ficar associada ao mesmo processo BPMN
- devo conseguir visualizar a imagem na interface

### O que o dev precisa fazer
- criar suporte a imagem BPMN
- criar preview visual no app
- criar vínculo entre `.bpmn` e imagem correspondente

---

## US-18 - Visualizar o BPMN na aba do agente
**Como** usuário  
**Quero** ver o BPMN salvo  
**Para** consultar rapidamente o fluxo

### Critérios de aceite
- a aba BPMN deve listar arquivos e imagens
- a imagem deve abrir em preview
- o `.bpmn` deve permitir download ou abertura
- a interface deve deixar claro qual é AS IS e qual é TO BE, quando existir

### O que o dev precisa fazer
- criar componente específico da aba BPMN
- suportar tags ou tipo do BPMN
- exibir metadados básicos

---

# FASE 7 - Status Report: HTML vivo e apresentação

## Objetivo da fase
Tratar o status report como artefato executivo vivo.

## Entregas da fase
- salvar markdown do report
- salvar html do dashboard
- salvar html da apresentação
- visualizar html dentro da ferramenta
- atualizar html com apoio da IA

---

## US-19 - Salvar status report em Markdown e HTML
**Como** usuário  
**Quero** salvar o status report em formatos adequados  
**Para** ter leitura textual e visual

### Critérios de aceite
- devo conseguir salvar o report em markdown
- devo conseguir salvar o dashboard em HTML
- devo conseguir salvar a apresentação em HTML
- os arquivos devem ficar na pasta 05_Status

### O que o dev precisa fazer
- criar artefatos do tipo STATUS_MD, STATUS_HTML, PRESENTATION_HTML
- adaptar `documentService`
- criar padrão de nomes dos arquivos

---

## US-20 - Visualizar HTML dentro da ferramenta
**Como** usuário  
**Quero** ver o dashboard e a apresentação HTML no próprio app  
**Para** validar e usar sem sair da plataforma

### Critérios de aceite
- devo conseguir abrir preview do HTML
- o preview deve respeitar o layout do arquivo
- devo conseguir abrir em nova aba, se quiser
- o sistema deve orientar que o HTML também pode ser salvo localmente

### O que o dev precisa fazer
- criar preview interno com iframe ou renderer controlado
- suportar HTML salvo no Drive
- criar botão “abrir no navegador”

---

## US-21 - Atualizar HTML do status report com apoio da IA
**Como** usuário  
**Quero** atualizar o dashboard HTML  
**Para** manter o artefato vivo e coerente com o andamento do projeto

### Critérios de aceite
- devo conseguir editar ou substituir o HTML
- a nova versão deve ficar salva
- o preview deve atualizar após salvar
- deve ser possível registrar quem atualizou e quando

### O que o dev precisa fazer
- criar fluxo de atualização do HTML
- registrar metadados
- preparar interface para futura assistência interna de IA

---

# FASE 8 - Histórico, rastreabilidade e colaboração

## Objetivo da fase
Dar rastreabilidade ao uso da plataforma e preparar o trabalho colaborativo.

## Entregas da fase
- histórico por projeto
- histórico por agente
- registro de artefatos
- compartilhamento de projeto

---

## US-22 - Registrar histórico de uso por projeto
**Como** usuário  
**Quero** ver o histórico do projeto  
**Para** saber o que foi feito e por quem

### Critérios de aceite
- o sistema deve registrar ações por projeto
- deve mostrar agente usado, data e resumo
- deve mostrar criação e atualização de artefatos

### O que o dev precisa fazer
- ampliar histórico no store/serviço
- criar timeline do projeto
- exibir na aba Histórico

---

## US-23 - Compartilhar projeto com outras contas Google
**Como** gestor  
**Quero** compartilhar o projeto com outras pessoas  
**Para** permitir colaboração sobre a mesma base

### Critérios de aceite
- deve ser possível registrar e compartilhar com outro e-mail Google
- a pessoa compartilhada deve acessar a mesma pasta do projeto
- o sistema deve refletir quem tem acesso

### O que o dev precisa fazer
- criar fluxo de compartilhamento via Google Drive permissions
- criar tela ou modal de compartilhamento
- registrar colaboradores do projeto

---

# FASE 9 - Ajuda, governança e preparação para escala

## Objetivo da fase
Garantir que o sistema seja utilizável por outras pessoas além do time criador.

## Entregas da fase
- ajuda contextual
- onboarding básico
- explicação de cada agente
- configuração centralizada

---

## US-24 - Exibir ajuda contextual sobre os agentes
**Como** usuário  
**Quero** entender para que serve cada agente  
**Para** usar o agente correto

### Critérios de aceite
- cada agente deve mostrar o que faz
- deve mostrar quando usar
- deve mostrar que tipo de saída entrega
- deve mostrar orientação de comunicação

### O que o dev precisa fazer
- adaptar página Help
- criar conteúdo orientado por agente
- usar o guia mestre como base

---

## US-25 - Centralizar configurações do sistema
**Como** administrador  
**Quero** configurar links, logo, variáveis e comportamentos  
**Para** adaptar o sistema sem mexer no código toda hora

### Critérios de aceite
- links dos agentes devem ser visíveis e configuráveis
- logo principal deve ser visível
- flags principais devem ser identificáveis
- ambiente deve ser claramente identificado

### O que o dev precisa fazer
- revisar `Settings.tsx`
- exibir variáveis relevantes
- criar documentação de configuração

---

# FASE 10 - Preparação da migração para opção 2

## Objetivo da fase
Deixar o frontend pronto para futura troca dos links externos por IA interna via API.

## Entregas da fase
- separação clara de adapters
- camada de provider para IA
- desacoplamento do launcher externo

---

## US-26 - Criar arquitetura preparada para IA interna futura
**Como** time técnico  
**Quero** deixar a estrutura preparada  
**Para** migrar depois sem refazer o sistema

### Critérios de aceite
- os agentes devem ter definição centralizada
- o launcher externo deve ficar desacoplado
- a camada de provider de IA deve poder ser trocada
- a UI do workspace deve continuar a mesma no futuro

### O que o dev precisa fazer
- separar adapter de agente externo
- preparar interface `AgentExecutionProvider`
- manter modo externo como padrão inicial
- documentar onde a IA interna será conectada depois

---

# 7. Backlog técnico transversal

## Itens transversais obrigatórios
- tratamento de erro
- feedback visual de carregamento
- toast de sucesso e falha
- nomes padronizados de arquivos
- nomenclatura consistente de tipos
- logs básicos de erro
- loading state por ação
- fallback local quando Drive falhar
- proteção de rotas autenticadas
- documentação do setup

---

# 8. Padrão de nomes dos arquivos gerados

## SAI
- `Storyboard_Inicial_YYYY-MM-DD`
- `Storyboard_Validado_YYYY-MM-DD`

## PM
- `Diagnostico_Projeto_YYYY-MM-DD`
- `Plano_Projeto_YYYY-MM-DD`
- `Backlog_Projeto_YYYY-MM-DD`

## BPMN
- `AS_IS_Nome_Processo.bpmn`
- `AS_IS_Nome_Processo.png`
- `TO_BE_Nome_Processo.bpmn`
- `TO_BE_Nome_Processo.png`

## Status
- `Status_Report_YYYY-MM-DD.md`
- `Dashboard_Executivo_YYYY-MM-DD.html`
- `Apresentacao_Executiva_YYYY-MM-DD.html`

---

# 9. Ordem recomendada de execução do desenvolvimento

## Sprint / Bloco 1
- Fase 1
- Fase 2

## Sprint / Bloco 2
- Fase 3

## Sprint / Bloco 3
- Fase 4
- Fase 5

## Sprint / Bloco 4
- Fase 6
- Fase 7

## Sprint / Bloco 5
- Fase 8
- Fase 9
- Fase 10

---

# 10. Resultado esperado do MVP

Ao final do MVP, o 7C Commander deve permitir:

- login com Google
- criação de clientes e projetos
- planilha mestre de projetos
- estrutura automática no Drive
- acesso por projeto
- uso dos 4 agentes por cenário
- salvamento e visualização de documentos
- BPMN como arquivo e imagem
- status report com HTML visualizável
- organização e colaboração por projeto
- base pronta para futura migração para IA via API

---

# 11. Definição executiva final

O **7C Commander** será uma plataforma de gestão de projetos com autenticação Google, organização estruturada por cliente e projeto no Google Drive, persistência de artefatos por agente, colaboração entre contas Google e acesso contextual a agentes especializados de IA para apoiar análise, gestão, modelagem de processos e comunicação executiva.

Ele deve nascer funcional como sistema de gestão e crescer depois para uma plataforma com IA interna orquestrada.