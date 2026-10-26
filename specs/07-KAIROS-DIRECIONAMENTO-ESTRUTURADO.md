# SPEC 07 — Kairos: direcionamento estruturado de múltiplos registros

Status: implementação inicial em validação. Não publicar em produção sem homologação.

## Problema
Uma resposta que apresenta sete riscos deve gerar sete registros distintos no projeto ativo, não um único risco com a resposta inteira.

## Entrega
- Parser determinístico de títulos em Markdown com descrição por item para respostas estruturadas.
- No diálogo de registro de risco, prévia editável com seleção individual.
- Persistência de um risco por item usando endpoint existente, no projeto ativo.
- Feedback de quantidade salva, inclusive falha parcial com orientações para evitar duplicatas.
- Respostas sem múltiplos itens usam o formulário anterior de risco individual.

## Critérios de homologação
- Os sete riscos da Clínica Movimentar-se geram sete registros distintos, com título e descrição individual preservados.
- Texto misturado com negrito, cabeçalhos e listas identifica corretamente os blocos; evita salvar as linhas de contexto como riscos extras.
- Desmarcar um item não o salva; editar título/descrição reflete no registro.
- Resposta sem estrutura não deve criar riscos artificiais.
- Não perder o projeto selecionado e não apresentar sucesso quando houver falha.
- Evitar duplicatas após reabertura e reenvio: melhoria necessária com chave de idempotência por mensagem/item no backend.
- Auditar persistência no módulo de Riscos e acesso multiusuário.
- Fluxos de decisão, conhecimento e tarefa são extensões futuras da mesma exigência; não inferir que já estão completos.

## Pendências para produção
Parser e submissão são melhorias incrementais; auditoria de batch transacional, idempotência e cobertura de formatos livres ainda não foram concluídas.
