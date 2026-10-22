# SPEC 01 - Prospects e funil comercial | 7Commander
Status: PROPOSTA. Prioridade P1 apos SPEC 00.

## Objetivo
Separar oportunidade comercial de cliente contratado, preservando vinculo com projetos e documentos de descoberta.

## Requisitos
PR-01 Entidade Prospect/Organizacao: razao/nome, origem, contato corporativo, responsavel interno, necessidade, consentimento/base legal quando aplicavel, ultima interacao e proxima acao.
PR-02 Funil configuravel minimo: Novo -> Qualificacao -> Diagnostico -> Proposta -> Negociacao -> Ganho/Perdido, com motivo e historico; sem converter automaticamente em cliente.
PR-03 Vincular prospect a uma ou mais oportunidades; oportunidades com escopo, valor estimado opcional, probabilidade opcional, data prevista, dono, tarefas e evidencias.
PR-04 Conversao explicita Ganho -> Cliente, com deduplicacao, preservacao de origem, atividades, requisitos e documentos; confirmar identificadores e relacoes.
PR-05 Projeto pode nascer em pre-venda/diagnostico com status distinguivel de projeto em execucao; vincular analises (SPEC 02-05), requisitos e aprovacoes.
PR-06 Lista, kanban e filtros por responsavel, etapa, data e pendencias; trilha de auditoria, RBAC e privacidade.
PR-07 Importacao CSV validada (preview, erros por linha, deduplicacao e idempotencia); exportacao somente autorizada.

## Fora de escopo
CRM de marketing, disparos automaticos e faturamento.

## Aceite
Prospect -> oportunidade -> diagnostico -> proposta -> ganho -> cliente/projeto com historico preservado. Dois usuarios com perfis diferentes nao podem ler/editar dados fora de sua permissao. Dados de prospect nao ativam automaticamente chamadas a modelos de IA.