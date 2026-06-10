# V2 Foundation - 7C Commander + Kairos

Este diretório consolida a base inicial da V2 para evitar dúvidas de origem de código.

## Estrutura criada

- `legacy-7c/source`
  - Cópia integral da base `webapp_pmcommandcenter-main`.
  - Objetivo: preservar componentes, telas e fluxos do 7C como referência viva.

- `supabase-kairos/database`
  - Schema e migrations atuais do Kairos/Supabase.

- `supabase-kairos/services`
  - Serviços de core, memória, conhecimento, projetos, tarefas e integrações já existentes.

- `supabase-kairos/app-api`
  - Rotas API já implementadas no Kairos para reaproveitamento direto.

- `supabase-kairos/types`
  - Tipos da camada atual em produção local.

## Componentes 7C preservados

- `AppShell.tsx`
- `ProjectHeader.tsx`
- `AgentCard.tsx`
- `ArtifactList.tsx`
- `HtmlPreviewPanel.tsx`
- `BpmnPreviewPanel.tsx`
- `ContextPanel.tsx`
- `QuickActionsBar.tsx`
- `ProjectForm.tsx`
- `ClientForm.tsx`
- `ShareProjectModal.tsx`
- `SettingsPanel.tsx`
- `Login.tsx`
- `ChatPanel.tsx`
- `ArtifactEditorDrawer.tsx`
- `FeedbackProvider.tsx`
- `SideDrawer.tsx`
- `SuggestionCard.tsx`
- `TechOutputViewer.tsx`

## Telas 7C preservadas

- `Dashboard.tsx`
- `Clients.tsx`
- `Projects.tsx`
- `ProjectWorkspace.tsx`
- `Artifacts.tsx`
- `ProjectArtifacts.tsx`
- `AgentsLab.tsx`
- `Help.tsx`
- `Settings.tsx`

## Migrations Supabase já reaproveitáveis

- `017_embeddings.sql`
- `021_decision_context.sql`
- `029_integrations_audit.sql`
- `030_voicefirst_project_knowledge.sql`
- `031_auth_and_project_sharing.sql`
- `032_task_kanban_foundation.sql`
- `033_task_card_details_and_audit.sql`

## Regras de implementação da V2 (decisão fechada)

1. Supabase é a fonte oficial dos dados estruturados.
2. Google Sheets sai do controle operacional (legado/importação opcional).
3. Google Drive permanece para arquivos físicos, com metadados no Supabase.
4. Login Google permanece como entrada padrão.
5. Componentes e experiência do 7C são preservados e evoluídos.
6. Kairos Core é integrado como camada cognitiva interna (voice-first + contexto por projeto).

## Próximo passo técnico sugerido

1. Criar `workspace-v2` no app Next atual com rotas equivalentes ao menu 7C.
2. Portar `AppShell`/navegação 7C para o layout atual.
3. Conectar telas a serviços Supabase já existentes antes de refinamento visual.
4. Ativar feature flags por módulo para rollout incremental.
