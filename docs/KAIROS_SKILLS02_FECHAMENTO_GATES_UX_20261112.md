# KAIROS-SKILLS-02 | Encerramento técnico e gates para retomada UX
Data: 2026-11-12. Branch: `work/local-kairos-operacional-20261111`. Status: **em correção, NÃO homologado**. Sem liberação para `develop` ou `main`.

## Contexto e evidências
Homologação de 14 respostas KAI-01 a KAI-13 (inclui KAI-04A e tentativa do KAI-04B sem Sprint), 4 etapas. KAI-04B operacional pendente com projeto que possua Sprint, US e impedimentos. Os 23 apontamentos KAI-FIX são observações, não necessariamente 23 defeitos independentes. Fixture Prosperitá: 6 riscos, 2 atividades (uma com título malformado), 1 decisão, 0 Sprint; conferir novamente antes de comparar, sem gravar no banco compartilhado.

## O que já existe
- Kairos Core com 23 módulos Markdown em `prompts/skills`, roteados por palavras-chave, até 5 por consulta.
- Resolução de projeto/empresa, fontes de projeto, riscos, decisões e snapshot de Kanban, consultas de Sprint/US apenas em certos tipos de pedido.
- `COMMANDER_LOCAL_READ_ONLY` bloqueia boa parte das mutações API e caminhos de escrita do Kairos, mas **NÃO** configura credencial exclusivamente de leitura nem cobre chamadas diretas do browser.
- RLS no Supabase compartilhado foi ajustado para leitura de notificações e perfis em 12/11. O isolamento de QA ainda não está demonstrado.
- Em 12/11, iniciou-se correção incremental: IDs oficiais no snapshot das atividades, códigos via `project_risk_display_codes` e títulos literais dos riscos no contexto.

## P0 | Gate 1: ambiente isolado e escrita controlada
1. Provisionar QA separado por projeto Supabase dedicado ou branch isolada, com fixtures fictícias. Nunca executar testes mutacionais, adversariais ou testes de RLS destrutivos na base compartilhada.
2. Definir credencial/role read-only para chamadas analíticas, ou mecanismo equivalente de acesso restrito com RLS/tenant efetivos e acesso de escrita impossível. Confirmar tecnicamente inclusive no navegador, na API, nos jobs e no modelo.
3. Separar execução de comandos de escrita de geração de texto: proposta, permissão no servidor, confirmação explícita, gravação rastreada e resposta com ID persistido.
4. Investigar a origem do card malformado pelas evidências de logs/auditoria e pelo parser de criação em lote; não corrigir o cadastro da produção sem autorização.
**Aceite:** zero alterações não autorizadas e zero vazamentos entre 2 empresas de QA, testados em rotas diretas e UI.

## P0 | Gate 2: grounding determinístico
1. Contrato único `EvidencePack`: tenant, projeto, público, timestamp, origem, IDs, códigos, títulos literais, status, total existente, total enviado, truncamento, motivo de falha.
2. Riscos: usar `project_risk_display_codes`; `R001` é ambiente Vita Primo, `R006` é aprovação de protótipo, nunca renumerar pelo índice. Se código não disponível, responder 'não disponível'.
3. Atividades: incluir IDs, títulos literais inclusive anômalos, estados exatos; não transformar prompt em título provável.
4. Consultar Scrum sempre que a pergunta exigir Sprint/US, independente da skill escolhida. Não afirmar ausência quando a consulta falhou.
5. Validador pós-resposta para referências, contagens, datas e classificações comprováveis; bloquear/regenerar ao detectar contradição verificável. Não usar apenas prompt como barreira.
**Aceite:** IDs/códigos fictícios = 0, substituição de títulos oficiais = 0, cobertura 100% ou truncamento explícito.

## P0 | Gate 3: autorização e visibilidade
1. Consultas sempre escopadas pelo JWT/tenant ativo e RLS, sem service role em fluxo do usuário.
2. Montar Status Report Cliente apenas de campos explicitamente permitidos **antes** de chamar o modelo; separar fonte de Equipe.
3. Auditar cenários com papéis owner/editor/viewer e dois tenants; tentativas de acesso cruzado, prompts hostis e APIs diretas.
**Aceite:** zero vazamento e zero escrita para perfil leitura.

## P1 | Gate 4: disciplina epistêmica e domínio regulado
- Benefício realizado exige KPI medido + período + fonte; protótipo e feedback não são benefício.
- Fato, hipótese, recomendação, evento materializado e risco futuro devem ter marcação distinta.
- Nunca sugerir burlar obrigações fiscais (NFS-e), clínicas ou jurídicas; solicitar análise de profissional habilitado.
- Tailoring proporcional ao estágio, sem criar Sprint obrigatória quando Kanban é mais adequado.
- Roteador multi-label avaliado, limitar 2–3 skills relevantes, registrar seleção/latência, sem ampliar catálogo agora.

## P1 | Gate 5: suíte de avaliações
- Fixtures: Prosperitá sem Sprint; projeto fictício com Sprint/US/impedimentos; 2 empresas fictícias com diferentes papéis.
- Execuções repetidas por cenário; asserções determinísticas de dados/IDs, avaliações humanas para qualidade consultiva.
- Métricas de regressão: identificadores inventados=0, vazamento=0, escritas não autorizadas=0, violações de domínio regulado=0, rastreabilidade e explicitação de truncamento.
- CI deve executar `typecheck`, `lint`, `build`, `skills:eval`, testes unitários/integração e gate factual. Registrar SHA, dados QA e resultados.

## Sequência de promoção e UX
A. Corrigir/validar em branch de trabalho; não acessar base PROD para mutações.
B. Criar revisão técnica e evidências dos gates, executar novamente KAI-01 a KAI-13, KAI-04B em Sprint real.
C. Promover para `develop` apenas após PASS documentado e autorização conforme governança do projeto; `main` exige autorização explícita.
D. As novas UX do Commander (navegação contextual, sidebar adaptativa, guias e ações padronizadas) podem continuar **em branch independente de interface** se não alterarem dados/autorizações. Integração no develop e publicação devem respeitar os gates do Commander.

## KAI-REG-01 | Correção de fidelidade e renderização (12/11/2026)
- Homologação observada: 6 riscos oficiais com códigos corretos e 2 cards com IDs corretos. Identificados título truncado pelo LLM e tabelas Markdown apresentadas como texto bruto.
- `components/ui/markdown-content.tsx` passou a renderizar tabelas Markdown com `thead`, `tbody`, rolagem horizontal localizada e marcação de cabeçalho.
- `lib/kairos-official-inventory.ts` define saída **determinística** para solicitações explícitas de inventário de riscos + atividades, sem reescrita generativa de títulos. A mesma rota apresenta códigos oficiais e informa limites de cobertura.
- `services/task-board-service.ts` passou a disponibilizar todas as atividades retornadas na consulta, inclusive concluídas, distinguindo inventário completo de subconjunto de abertas.
- `tests/unit/kairos-official-inventory.spec.tsx` adiciona regressões de fidelidade de título, renderização de tabela e truncamento.
- **Pendente**: executar testes e build na máquina local no novo SHA; Vercel reportou limite de builds do plano, não um gate de compilação verificável. Validar visualmente em `localhost:3100/chat`.
- Esta correção não substitui os gates P0 de ambiente QA isolado, confidencialidade Cliente/Equipe, autorização e investigação do título malformado já persistido.
