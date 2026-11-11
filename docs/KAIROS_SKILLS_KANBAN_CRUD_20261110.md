# KAIROS-SKILLS-01 e KAN-CRUD-01 | Arquitetura, auditoria e homologação

Data: 10/11/2026. Escopo: branch `develop`. Produção somente após revisão e autorização explícita.

## Habilidades
Habilidades versionadas em `prompts/skills/*/SKILL.md`, carregadas pelo `services/capability-modules.ts` com correspondência por intenção e inseridas no prompt em `services/kairos-core.ts`.
- Diagnóstico de projeto
- Gestão e avaliação de riscos
- Kanban e execução controlada
- Backlog, Épicos, Features e US (INVEST)
- Scrum, Sprint e Daily
- Decisões e governança
- Status Report Cliente / Equipe
- Integrações e dados (GET/POST, sistemas mestres, auditoria)
- Processos e BPMN
- Stakeholders e matriz de responsabilidades
- Reuniões, compromissos e encaminhamentos
- Qualidade, testes e homologação

O prompt principal fica em `prompts/core/pm-ai-partner.md`. Arquivos carregados pelo servidor requerem build/deploy. Alterações futuras nos textos não exigem refazer páginas ou endpoints, mas continuam sujeitas a avaliação e CI.

## Evol-Instruct
O Evol-Instruct original é metodologia de evolução de exemplos e geração de dados para treino/fine-tuning, não runtime de Agent Skills. Os repositórios WizardLM/WizardCoder trazem restrições explícitas a uso comercial para recursos associados: **nenhum código, pesos ou dataset dessas fontes foi incorporado**.
Adoção atual: formato aberto Agent Skills, sem dependência do código WizardLM. Uma futura automação própria de evolução de prompts deverá trabalhar com casos sintéticos sem dados de clientes e aprovação humana por benchmark.
Métricas mínimas propostas: acerto de roteamento (%), fidelidade aos registros, taxa de duplicidade, operações não autorizadas (meta zero), IDs reais retornados, custo/tokens e tempo de resposta. Não atribuir ganho sem comparação controlada.

## Comando em lote ATV
Quando o gestor enviar solicitação explícita de criação com linhas `ATV-NN | título` e Descrição + Critério de aceite, o processamento:
- valida contexto de projeto e autorização;
- lê Kanban existente, identifica título/referência funcional já registrados;
- cria apenas registros faltantes em TO DO, preservando prioridade, data informada e critério de aceite;
- não cria Sprint nem atribui responsável sem evidência;
- retorna quantidade, IDs reais, já existentes, não criados e vínculos não efetivados;
- nunca afirma operação sem retorno de persistência.
Não há conexão automática de riscos por inferência. Só vínculo autorizado com ID verificável.

## Auditoria de CRUD e navegação
| Área | C | R | U | D | Regra |
| --- | --- | --- | --- | --- | --- |
| Projeto | Sim | Sim | Sim | Sim, restrito | Exclusão exige projeto vazio e administrador |
| Stakeholders | Sim | Sim | Sim | Sim | Alterações salvas nos detalhes do projeto |
| Kanban Atividades | Sim | Sim | Sim | Adicionado | Confirmação, auditoria persistente, bloquear risco/Sprint |
| Riscos oficiais | Sim | Sim | Sim, edição em drawer | Não liberado | Encerrar registro, preservar histórico e relatórios autorizados |
| Decisões | Sim | Sim | Sim, edição em drawer | Não liberado | Cancelar registro, preservar histórico de decisões |
| Documentos de conhecimento | Sim | Sim | Exige reenviar versão | Sim | Exclusão já disponível; versionamento é lacuna |
| Reuniões | Sim | Sim | A avaliar | A avaliar | Governança de encaminhamentos ainda não homologada |
| Épicos/Features/US/Tasks Scrum | Conforme API específica | Conforme API | Conforme API | Conforme bloqueios Sprint | Validar cenários individualmente; não presumir CRUD completo |
| Equipe/Concessões | Convite | Sim | Revogação/alteração parcial | Revogação | Identidades e autorização separadas de stakeholders |

Origem do card: campo exibido por histórico `task_created.metadata.source`, com `user`, `kairos` ou `unknown` para dados históricos sem origem comprovada. O botão “Analisar com Kairos” não é indicativo de autoria.

## Verificações antes do merge em produção
1. Pipeline: `npm ci`, `typecheck`, `lint`, unit tests e `build`.
2. Aplicar migration aditiva `20261110213000_kan01_task_deletion_audit.sql` no banco compartilhado apenas após revisão. Verificar RLS e grants.
3. Em conta owner/editor: criar card manual e pelo Kairos; verificar “Criado por” correto, persistência e linha `task_created`.
4. Em viewer: testar DELETE e PATCH por API. Devem ser negados sem alterar dados.
5. Criar card sem vínculos e excluir após confirmação; verificar desaparecimento e snapshot na auditoria.
6. Card com risco oficial ou Sprint: exclusão rejeitada; testar referências intactas.
7. Em Projeto: Criar Risco e Criar Decisão abrem drawer mesmo com lista recolhida. Botões +/- apenas expandem registros. Editar mantém o mesmo ID.
8. Perguntar “Quais riscos do projeto?”: sem resposta genérica e sem gravar riscos automaticamente.
9. Testar pedido em lote de atividades com 12 ATV: criados, duplicados, IDs, prioridades, data única, zero Sprints. **Não executar em projeto real sem autorização separada.**
10. Retorno global das telas, inclusive links diretos, e HTML/PDF de relatórios anteriores sem regressão.
11. Revisar saída de habilidades com casos de projeto, riscos, decisão, integração, BPMN e status report, registrando ganho mensurável.

Nenhuma confirmação de PASS funcional/visual de homologação deve ser inferida exclusivamente do pipeline.
