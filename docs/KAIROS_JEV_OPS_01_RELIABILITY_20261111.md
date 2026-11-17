# KAIROS-JEV-OPS-01 | Plano de avaliação de confiabilidade operacional

Data: 11/11/2026. Escopo: próxima fase do Kairos, **fora do release UX para develop**.

## Situação real

- Existe `lib/jev-gateway-adapter.ts`, integrando um avaliador consultivo ao Vercel AI Gateway sob `SEVEN_COMMANDER_JEV_ENABLED=true` e `AI_GATEWAY_API_KEY`.
- O adaptador aceita estado limitado do registro, uma rubrica fechada para gravidade e devolve `reviewRequired=true`. NÃO grava operações, NÃO valida persistência, NÃO constitui prova factual.
- Existe `lib/operational-intelligence.ts` com regras determinísticas e política de revisão. O JEV pode ser segunda opinião, não fonte única da decisão.
- O roteamento de habilidades `services/capability-modules.ts` carrega o core `prompts/core/pm-ai-partner.md` e `prompts/skills/*/SKILL.md` conforme intenção.

## Proposta objetiva de verificação (antes e depois de operações)

1. **Pré-operação:** validar empresa/projeto ativos, papel e autorização explícita, schema, duplicidade, alterações propostas, impacto e criticidade. JEV opcional para sinalizar risco/ambiguidade; contrato do servidor decide permitir/recusar.
2. **Execução:** somente via API autorizada, com idempotency key por item/lote, sem mutações dentro do avaliador JEV.
3. **Pós-operação:** consultar a base para confirmar registro persistido, tipo, ID, `organization_id`, `project_id`, estado e vínculo, com trilha de auditoria. Se falhar, marcar parcial e **não alegar sucesso**.
4. **Revisão humana:** JEV revisa coerência da justificativa e evidência, mas não substitui consulta real. Em erro do Gateway, continuar com política determinística e revisão humana.
5. **Lote:** relatório com solicitados, criados, já existentes, erros, IDs e evidências, sem duplicar parcialmente gravados.

## Indicadores mensuráveis

- Taxa de ações realmente persistidas / ações informadas como sucesso.
- Taxa de ações não autorizadas executadas: meta ZERO.
- Precisão de associação empresa/projeto: meta 100%.
- Duplicidades por reenvio/lote: meta ZERO.
- Percentual de retornos com ID e trilha de auditoria: meta 100%.
- Falsos positivos e negativos da revisão JEV versus julgamento humano.
- Latência e custo do JEV, indisponibilidade e fallback.

## Banco de provas inicial

Casos sintéticos: criação única, criação repetida, erro parcial em lote, viewer com tentativa de escrita, trocar empresa durante solicitação, risco sem probabilidade, decisão sem justificativa, tarefa vinculada a sprint encerrada, retorno de API sem ID, timeout do JEV, texto malicioso dentro de documento. Registrar cenários reproduzíveis em testes automatizados.

## Critérios de ativação

JEV é **controle auxiliar**, nunca autenticação, RLS, commit de transação, auditoria nem prova de salvamento. Não habilitar a flag em produção apenas por aprovação do UX. Fazer baseline com regras determinísticas, A/B com JEV, review humano e resultados mensuráveis antes de adotar como componente validado no 7Components.
