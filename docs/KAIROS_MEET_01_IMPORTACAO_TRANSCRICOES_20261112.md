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
