# SPEC 10 — Workbench integrado de pré-venda e análise (lote em desenvolvimento)

## Situação real
**Implementação parcial e não homologada**. A migration 048 foi criada no repositório, **não aplicada no Supabase de produção**. Nenhum deploy foi solicitado nesta rodada.

### Disponível no código
- `/planning` e menu: seleção de 6 áreas, cadastro, listagem paginada 25 itens, edição versionada e estados de revisão.
- `/api/planning` com autenticação JWT, vínculo ativo à organização Consult Services e validação de edição por projeto, versão otimista, fonte HTTPS opcional.
- `commander_planning_records` e `commander_planning_audit` com histórico e RLS habilitada (sem políticas de acesso público; service_role apenas no backend).
- Rascunhos de prospects, oportunidades, requisitos, pesquisa manual, avaliações e decisão com gate humano.
- Nenhuma busca externa é executada nem informações confidenciais são transmitidas. URL de evidência é apenas referência informada pelo operador.

### Não concluído (bloqueadores para chamar SPECs 01–05 de prontas)
1. Múltiplas oportunidades por prospect e pipeline Kanban comercial, conversão transacional em Cliente e deduplicação.
2. CSV com prévia, importação idempotente e exportação autorizada.
3. Baseline imutável de requisitos, dependências estruturadas, anexos, comparação e sugestões de conflitos/lacunas.
4. Provedor de pesquisa externa seguro, quotas, robôs, URLs bloqueadas, capturas de evidência verificadas e status de validade.
5. Matriz normalizada requisito x alternativa, pontuação com cobertura de evidência, revisão/decisão imutável e geração idempotente de backlog.
6. Orquestrador persistente de jobs, checkpoints e retomada, roteador LLM governado, custos e desligamento emergencial.
7. Auditoria e alterações precisam ser atômicas, revisão de RLS, gestão multiempresa sem org hardcoded, perfil RBAC aprofundado.
8. Build, lint, typecheck, testes de API/UI, carga, segurança e validação humana.

### Roteiro único da homologação integrada (somente após conclusão)
1. Conta superadmin e gestor, sessão isolada; leitor e usuário desativado sem escrita; acesso indevido a outro tenant deve falhar.
2. Cadastrar prospect fictício, oportunidades e etapas; converter ganho em cliente preservando trilha, sem duplicatas.
3. Vincular projeto de diagnóstico ao cliente, criar baseline v1 e requisito v2; conferir histórico/aceite/aprovação.
4. Pesquisar solução externa com fontes e datas, marcar ausências como não verificadas; testar proteção de URL e PII.
5. Comparar alternativa e desenvolvimento interno com cobertura por requisito; aprovar decisão e gerar backlog idempotente.
6. Kairos registra múltiplos riscos separadamente e preserva falha parcial/idempotência.
7. Atribuir atividades entre Christian e Rodrigo, salvar, reabrir, ver sino e aviso central.
8. Desativar usuário; verificar revogação e isolamento imediato. Testar concorrência e versão de registros.
9. Arquivar projeto e excluir apenas QA sem histórico; impedir exclusão com tarefas reais.
10. Medir p50/p95 e requisições com 2, 30 e 300 projetos; verificar mobile e desktop.
11. Validar audit trail, backup, rollback, SHA de develop e separação demo/main.
12. Registrar PASS/FAIL e evidências e só então decidir promoção.

**Gate:** Não declarar READY nem liberar clientes reais até migração em ambiente de homologação, build/testes automáticos e assinatura da validação humana.
