# HV-UX-06 | Aceite do usuário e pendências operacionais Kairos

Data: 11/11/2026. Branch: `work/local-kairos-operacional-20261111`.

## Homologação informada pelo responsável

- UX global e padrão de ícones: **aceitos visualmente**.
- Clientes e Projetos: **aceitos**.
- Kanban: **aceito**.
- Scrum, Sprint e Backlog: **leitura/consulta aceitas**; operações de escrita NÃO homologadas.
- Status Report: **visualização aceita**; emissão com histórico, PDF e controle de visibilidade não explicitamente homologados aqui.
- Alteração de empresa em outra aba: tela de bloqueio de contexto foi observada. O bloqueio da aba antiga é comportamento de segurança atual; contexto independente por requisição continua pendente.

**Não inferir** aprovação de CRUD, APIs diretas, segurança cross-tenant ou emissão completa de PDF a partir deste aceite de leitura.

## Pendências operacionais Kairos

- KAIROS-OP-01: validar comando explícito de criação e movimentação de atividades; conferir ID real, estado final, autoria e trilha de auditoria.
- KAIROS-OP-02: validar riscos e decisões oficiais com revisão humana, conteúdo estruturado, vínculo ao projeto e prevenção de duplicidade.
- KAIROS-OP-03: homologar gravação de reuniões, US e Tasks de US, preservando referências, hierarquia e permissões.
- KAIROS-OP-04: tratamento transacional/idempotência em operações em lote e parciais; não repetir itens confirmados.
- KAIROS-OP-05: conferir rastreabilidade de comandos, mensagens, IDs de objetos e histórico, sem sucesso fictício.
- KAIROS-OP-06: multiempresa, troca de contexto, viewer/owner/editor e isolamento API são gate de segurança.
- KAIROS-QUAL-01: qualidade de análises de projeto, riscos e relatórios baseada em evidências, política de não inventar fatos.
- KAIROS-MEM-01: sessão, memória, persistência/autorização, recuperação correta e verificação de indisponibilidade de IA.

### Lacunas observadas no código e candidatas a correção

- `services/kairos-core.ts` reconhece comandos textuais explícitos e pode executar criação/movimento de tarefas diretamente. Testar confirmação adequada e não executar em caso de ambiguidade.
- `components/kairos/use-kairos-core.ts`, `handleSaveRisk`: o campo `impact` recebe `risk.description || riskForm.impact.trim()`. Isso pode gravar descrição narrativa no lugar da classificação de impacto. Corrigir com teste de contrato e sem perder descrição original.
- `handleSaveTask` verifica duplicados no início, mas operações parciais em lote podem deixar itens persistidos antes da falha. Reconsultar e retomar sem duplicar.
- `app/api/chat/route.ts` somente persiste mensagens quando `localWriteGuardEnabled()` é falso; validar ambiente/localização de gravações e não confundir consulta com memória permanente.
- `docs/KAIROS_SKILLS_KANBAN_CRUD_20261110.md` já aponta validação de lote de atividades, proteção viewer, origem do card e casos por habilidades. Não executar 12 atividades em projeto de cliente real sem autorização.

## Estratégia

Concluir revisão técnica e testes em branch local. Validar ações CRUD em laboratório/test data isolados com RLS e auditoria. Não promover para develop/main nem modificar permissões oficiais sem gate. Documentar resultado específico por operação.
