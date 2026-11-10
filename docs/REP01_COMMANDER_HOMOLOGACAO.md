# REP-01 | Status Reports por público e identidade Commander
Data de referência: 09/11/2026. Branch: develop. Sem publicação em produção.

## Componentes implementados
- `app/status-report/page.tsx`: relatórios Cliente e Equipe com composição HTML distinta e impressão/PDF via browser; prévia e exportação usam a marca de empresa ativa.
- `lib/scrum/report-data.ts`: mesmos agregados operacionais de origem; API Cliente retira Sprints, responsáveis, títulos de tarefas, descrições internas e inclui somente fatos explicitamente aprovados para divulgação.
- `app/api/status-report/analysis/route.ts`: contexto do Kairos por público. Para Cliente, riscos/decisões/tarefas internos não são enviados como títulos de texto; fatos públicos aprovados são a fonte da narrativa. A IA é proibida por prompt de inferir prazos, reuniões e aceites.
- `app/api/status-report/history/route.ts`: snapshot recalculado no servidor, versão Cliente com narrativa factual derivada de dados autorizados; acesso por perfil e empresa; legado Cliente redigido na leitura para perfil não interno.
- `app/api/status-report/public-facts/route.ts`: rascunho de divulgação, confirmação explícita por título, suspensão, autorização por papel e empresa/projeto.
- `components/status-report/public-facts-editor.tsx`: interface do responsável para preparar e aprovar informações externas.
- `supabase/migrations/20261109161000_rep01_public_facts.sql`: classificação pública separada, RLS deny-by-default, acesso exclusivo do serviço, aprovação auditável, isolamento empresa/projeto.
- `lib/brand.ts`, `app/layout.tsx`, `app/manifest.ts`, `app/icon.tsx`, login e outros textos: nome de produto Commander; ícone de aba baseado no arquivo enviado pelo responsável.

## Regras de composição
**Cliente:** objetivo e benefícios autorizados, entregas e marcos aprovados, riscos divulgáveis, próximos passos. Campos são identificados como confirmado / em andamento / hipótese / recomendação de IA. Dados não aprovados são ocultados por padrão. Valores de atividade numéricos são fotografia operacional, não percentuais de aceitação contratual.

**Equipe:** quadro operacional, Sprints, US, Tasks, responsáveis, pendências, riscos, decisões e execução, com permissões owner/editor.

**Consistência:** os números compartilhados de registros de atividade e conclusão são calculados uma única vez em `loadReportData`. Indicadores não compartilháveis têm rótulos distintos (por exemplo, riscos divulgados ao cliente versus riscos internos).

## Validação obrigatória
1. Em projeto Mardisa-FE, mesma data/período: comparar Cliente e Equipe. Valores compartilhados devem ser iguais.
2. Criar fatos públicos em rascunho. Garantir que não apareçam no Cliente antes da confirmação.
3. Aprovar um marco real com data comprovada; testar rótulo e prazo no HTML/PDF Cliente. Retirar aprovação e verificar que desaparece.
4. Confirmar que título/descrição/responsável de Task interna, nota de Sprint e impedimento operacional não constem do JSON, IA nem HTML Cliente sem aprovação.
5. Usuário VIEWER pode ler apenas Cliente autorizado. POST de classificação, relatório interno e snapshot interno devem retornar 403.
6. Usuário revogado no 7Service, empresa sem vínculo e requisição anônima não podem consultar ou publicar registros.
7. Verificar separação entre fato confirmado, trabalho em andamento, hipótese e recomendação; não gerar compromissos fictícios.
8. Exportar Cliente e Equipe para HTML e PDF via impressão, revisando a identidade visual conforme whitelabel. Validar histórico de emissão antiga e nova.
9. Abrir nova aba, confirmar título Commander e favicon fornecido; alternar 7Consulting / Consult Services sem vazamento de marca.
10. Executar npm ci, lint, typecheck, build e smoke tests no preview.
11. Aplicar migrations primeiro em ambiente QA isolado e verificar RLS, integridade, acesso service_role, gatilhos e auditoria; não aplicar no banco oficial sem autorização.

## Pendências externas
- Vercel recusou novo deployment pelo limite diário HTTP 402. Não existe preview READY do commit consolidado.
- Banco QA dedicado ainda não está preparado para validar as migrações do lote. Não usar o banco oficial como laboratório.
- As mudanças estão versionadas; não confundir código escrito com versão homologada.
- Nenhuma mudança de nome de repositório, domínio ou backend foi solicitada. Mantê-los estáveis, alterando apenas a marca apresentada.
