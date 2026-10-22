# SPEC 02 - Intake e analise de requisitos | 7Commander
Status: PROPOSTA. Origem conceitual: ASF (Business Analyst, Requirements Reviewer, Ingestion e Product Owner). Prioridade P1.

## Objetivo
A partir dos requisitos JA vinculados a projeto ou oportunidade, gerar uma analise estruturada sem duplicar a fonte oficial.

## Requisitos
AR-01 Receber selecao de projeto, baseline versionada de requisitos existentes e anexos permitidos (texto, MD, PDF, DOCX, XLSX, imagem com processamento opcional).
AR-02 Normalizar requisito com ID estavel, versao, categoria funcional/nao funcional/legal/operacional, prioridade, criterio de aceite, dependencias, fonte, autor e classificacao de confidencialidade.
AR-03 Detectar conflitos, lacunas, redundancias e pressupostos; produzir perguntas para cliente/equipe e distinguir fatos de inferencias.
AR-04 Submeter alteracoes sugeridas a revisao humana; NUNCA sobrescrever requisitos aprovados automaticamente.
AR-05 Preservar proveniencia de cada conclusao e estado de execucao; retomar falhas com idempotencia por input/version.
AR-06 Registrar documento de cenario atual, requisitos, questoes abertas, riscos e parecer inicial. Permitir exportacao MD/PDF em etapa posterior sem exigir que arquivos sejam fonte primaria.
AR-07 Multiempresa, projeto, RBAC, limites de custo IA e trilha de auditoria. Sem fornecer documentos confidenciais a buscadores externos.

## Aceite
Com requisitos incompletos, devolve perguntas e pendencias, nunca certeza inventada. Ao mudar baseline, versao antiga permanece auditavel; analise nova e marcada stale ate reexecucao. Nenhuma sugestao se torna requisito aprovado sem decisao humana.