# SPEC 05 - Orquestracao governada pelo Kairos | 7Commander
Status: PROPOSTA. Origem conceitual: ASF LangGraph, process runner, execution trail e providers. Prioridade P2.

## Requisitos
OG-01 Orquestrador nativo associado ao Kairos: estados INICIADA -> REQUISITOS -> PESQUISA -> MATRIZ -> REVISAO -> APROVADA/REJEITADA, com estados PAUSADA, FALHOU e CANCELADA.
OG-02 Agentes/funcoes especializados e isolados por contrato: ingestao, analista, revisor, pesquisador, verificador, avaliador e planejador. Interface pluggable; nao exigir Python/LangGraph no runtime Next.js sem ADR e comparacao operacional.
OG-03 Jobs persistentes, checkpoint, idempotencia, reprocessamento seguro e cancelamento; evitar tarefas longas dependentes de request HTTP efemero da Vercel.
OG-04 LLM router configuravel, prompt versionado, modelos e custos por execucao; nao enviar secrets, PII ou anexos externos por padrao.
OG-05 Escopo de ferramentas minimo por etapa; acesso somente leitura a fontes externas; acoes de escrita exigem autorizacao e trilha. Nenhuma autoaprovacao.
OG-06 Logs sem informacao sensivel, observabilidade por execucao, quotas e controles administrativos.
OG-07 Flags independentes para liberar SPEC 02/03/04 gradualmente; desligamento emergencial sem impacto no cadastro ou na gestao de projetos.

## Aceite
Falha e retomada preservam checkpoints e nao duplicam efeitos; o usuario ve claramente custo e fontes; Kairos nao executa mutacoes fora das permissoes. Publicar somente apos teste de carga, seguranca e human validation.