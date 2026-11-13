# KAIROS-MEET-01 | Importação de transcrições para reuniões
Data: 12/11/2026
Status: IMPLEMENTADO EM BRANCH LOCAL, GATES E HOMOLOGAÇÃO FUNCIONAL PENDENTES.
Branch: work/local-kairos-operacional-20261111

## Objetivo e telas
Em /chat (projeto ativo) e /projects/[projectId]/meetings, o componente `MeetingTranscriptImport` permite enviar PDF, DOCX, TXT, MD, CSV, JSON, VTT e SRT, ou colar texto de Teams, Gemini ou de qualquer ferramenta.
O upload chama `POST /api/projects/[projectId]/meetings/draft`: lê e estrutura a fonte com IA, sem salvar registros oficiais ou enriquecer dados do projeto automaticamente.
A prévia exibe título, data, participantes, objetivo, resumo, avanços, decisões, compromissos, pendências, riscos, próximo acompanhamento, incertezas e encaminhamentos propostos.
Somente o botão de aprovação faz `POST /api/projects/[projectId]/meetings`, que preserva a política de owner/editor e detecta reunião duplicada por título e horário. Viewer apenas consulta e prepara prévia, sem poder salvar.
A fonte original não é armazenada permanentemente. PDF recebe upload temporário para extração pela API da OpenAI, com tentativa de exclusão logo após processar. Campo de origem armazena apenas referência/nome informado.

## Inteligência e governança
A skill `meeting-followup` foi evoluída para transcrições e para distinguir propostas de decisões confirmadas.
O Kairos passa a consultar reuniões oficialmente cadastradas quando a pergunta pedir acompanhamentos, compromissos ou atas, com filtro de projeto + organização.
A extração recebe títulos de riscos e decisões existentes, também filtrados pelo projeto e organização, como candidatos a vínculo. O sistema não cria vínculos durante a extração.
Encaminhamentos inferidos permanecem sugestões textuais. Cadastros de riscos, tarefas, decisões e movimentos dependem de revisão humana em suas rotinas próprias.
Datas e responsáveis incertos permanecem vazios e a ata exige preenchimento manual do horário antes de aprovação.
Não há alteração em banco/migration para este MVP.

## Testes esperados
1. Executar `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run skills:eval` e `npm run build`.
2. Em /chat selecionar projeto e importar notas TXT ou texto colado, verificar prévia editável sem qualquer gravação.
3. Testar PDF, DOCX, arquivo .vtt/.srt e rejeição de extensão inválida, 8 MB ou texto insuficiente.
4. Sem data/hora na fonte, exigir preenchimento humano; fonte com decisão apenas debatida não pode ser apresentada como aprovada.
5. Em ambiente local read-only, verificar bloqueio de `POST /meetings` mesmo por API direta.
6. Em ambiente QA descartável, com owner/editor, aprovar uma única reunião, garantir que somente a reunião foi criada e revisar vínculos manuais; viewer recebe 403 em tentativa de gravação.
7. Perguntar ao Kairos sobre compromissos da reunião cadastrada e verificar leitura dos registros certos, sem inventar progresso.
8. Testar reenvio com mesmo título e horário e esperar 409, sem duplicação.

## Limitações
A transcrição original não fica disponível para download. A comparação de vínculos ainda é uma sugestão sem associação automática. Grandes PDFs ou saídas complexas podem exigir ajustes no modelo de extração. Nenhuma integração direta com Teams/Gemini APIs é necessária: o fluxo é por upload ou colagem do conteúdo.
Não há deploy na develop ou main até validação do lote.

## R2 | 13/11/2026 | Documentos Mardisa
A comparação do PDF resumido (2 páginas) e DOCX integral (85 páginas) identificou omissão de compromissos, confusão de participantes e erro de atribuição da nova liderança.
Atualização local:
- Extração por blocos de até 12 mil caracteres para textos e DOCX, com limite explícito de 12 blocos e falha caso algum bloco não retorne saída estruturada.
- Evidências individualizadas com situação, horário, responsável sugerido e trecho. Consolidação com seleção humana de quais encaminhamentos registrar.
- Revisão em abas: Dados da reunião, Encaminhamentos e Conferência da fonte.
- Transcrição completa não é armazenada no projeto. PDF continua com entrada direta no modelo, não com auditoria por páginas.
- Nenhum cadastro automático de card, risco ou decisão.

### Regressão obrigatória no DOCX
1. Conferir compromisso de retorno da equipe ao fim (~01:18), envio de relatórios (~00:42) e demonstração de ferramenta (~00:33).
2. Verificar que Christian, não Marcelo, é identificado como novo responsável que substitui Varela.
3. Separar nomes mencionados de presenças confirmadas e falantes numerados.
4. Não afirmar inexistência de API para lote sem evidência conclusiva.
5. Comparar a cobertura com A01 a A07 do PDF, sem impor mesma contagem a documentos de granularidades distintas.
6. Testar seleção, edição, rejeição de ações, campo de data obrigatório e bloqueio de gravação local.
7. Rodar typecheck, lint, test:unit, skills:eval e build; gates e QA real ainda pendentes.

### Limitações
Os horários e trechos de evidência são extrações propostas pela IA e exigem revisão contra o original. Processar todos os blocos não assegura extração exaustiva. PDFs extensos ainda exigirão estratégia de extração por páginas. Múltiplas chamadas aumentam tempo e custo.

## MEET-02 | 13/11/2026 | Ampliação da capacidade do Kairos a partir de projetos open source
Referências arquiteturais revisadas, **sem incorporar código externo**:
- Meet2Notes (MIT): separação de captura, transcrição, relatórios intermediários e consolidação.
- take-minutes (MIT): extração por blocos, recuperação e deduplicação.
- AI Meeting Intelligence System (licença não identificada): contrato estruturado, evidência localizada na transcrição e filtro conservador de atribuições. Referência conceitual apenas, não copiar código.
- MeetingScribe (MIT): diarização e correção de identidade para uma fase posterior de entrada por áudio.
- JEV: considerar teste em modo observação separado; não é dependência da execução do Kairos.

**Entregue neste incremento**
- Serviço independente de grounding `services/meeting-grounding.ts`: confere citações literais ou normalizadas no bloco original, preserva posição e sinaliza ausência de evidência. Quando uma citação não é localizada, o item é despromovido a revisão, sem responsável nem inclusão automática.
- Identificação conservadora de possíveis duplicidades por similaridade de títulos, sem excluir ocorrências nem fundir evidências distintas.
- Indicadores de evidências localizadas e avisos por ocorrência na prévia de revisão.
- Testes unitários com citações reais, citação inventada, classificação conservadora e duplicidades. O documento original continua não sendo gravado na base do projeto.
- Integração à skill existente `meeting-followup`. Sem segundo agente nem API externa obrigatória.

**Ainda não concluído**
- Conferência semântica completa de cada paráfrase contra o trecho (localizar citação não garante interpretação correta).
- Extrator JSON Schema rígido, fonte textual PDF por página, retomada de processamento e versionamento persistente de execuções.
- Comparação objetiva com JEV, integração de áudio/diarização, homologação de gravação no banco.
- Gates CI e teste real Mardisa após o incremento ainda não executados.

**Critérios de revalidação**
1. Mardisa DOCX: validar cobertura e trechos reais. Não tratar `7/7 blocos` como prova de exatidão.
2. Conferir número de trechos localizados, itens não encontrados e categorias; não aceitar automaticamente itens sem citação verificável.
3. Confirmar que troca de liderança, participantes e compromissos não recebem nomes sem prova.
4. Conferir possíveis duplicidades entre blocos, mantendo os itens distintos quando necessário.
5. Conferir zero itens pré-selecionados e nenhuma escrita em projeto/produção durante a prévia.
6. Executar typecheck, lint, test:unit, skills:eval e build no HEAD local; manter develop/main intactas.

## REP-MEET-01 | Reuniões como fonte do Status Report (13/11/2026)
- **Equipe / Gerencial**: `loadReportData(...,"internal")` consulta reuniões do mesmo projeto e empresa (em desenvolvimento protegido, usa apenas os arquivos locais `.local-meetings`). Cada linha de `commitments` e `pending_items` aprovada na ata aparece na seção `Compromissos e pendências`, com título da reunião, data, classificação e informações literais. Não significa que a atividade foi executada.
- A fonte também integra a análise Kairos opcional para a equipe, explicitamente identificada como registro de reunião, e não como entrega comprovada. O snapshot do relatório Equipe inclui essas informações no momento da emissão; a visualização de histórico usa o snapshot, não reconsulta reuniões posteriores.
- **Cliente / Executivo**: nenhuma ata, resumo, participante, responsável ou pendência interna entra automaticamente. Encaminhamentos selecionados em reuniões aparecem somente como candidatos de `next_step` em `PublicFactsEditor`; um editor pode revisar e publicar expressamente o texto. A origem `meeting:<id>:<commitment|pending>:<índice>` é validada no servidor, com vínculo ao projeto e empresa. Não se publica dado oriundo do armazenamento de teste local.
- A versão Cliente utiliza apenas `project_report_public_facts` com `approved_for_client=true`. O relatório Cliente não inclui os dados de `internal.meetingLines`. Dados locais são rotulados `DADOS DE HOMOLOGAÇÃO LOCAL` no relatório Equipe.
- Nenhum card de Kanban, decisão ou risco é criado pela integração; somente informação de acompanhamento é exibida. Não há alteração de banco nem implantação na `develop`/`main`.
- **Critérios de aceite:** reunião Mardisa salva localmente, relatório Equipe em situação atual identifica um compromisso e uma pendência com a reunião de origem; Cliente não exibe esses textos sem publicação formal; opção de publicação a partir de reunião oficial é restrita a gestor, valida empresa/projeto e rejeita fonte local; arquivo histórico Equipe preserva snapshot; tipo de público e data não são inferidos como conclusão. Executar typecheck, lint, testes unitários e build no mesmo SHA, depois homologar preview HTML/PDF.
