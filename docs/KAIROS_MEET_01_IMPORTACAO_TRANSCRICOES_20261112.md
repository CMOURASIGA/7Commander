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
