# 7Commander — Fechamento técnico do lote fora da SPEC 08

**Branch:** develop
**Status:** código integrado; homologação técnica e humana PENDENTES.
**Restrições:** sem deploy Vercel, sem promoção para main e sem migração remota nesta execução.

## Escopo
1. **Prospect → Oportunidade → Projeto → Kanban:** conclusão atômica e idempotente pela função `commander_complete_opportunity`, vínculo ao cliente convertido, auditoria e acesso direto à tela de geração de backlog. Endpoint do backlog com validação estrita de UUID, decisão e requisito distintos, aprovação exigida e consulta idempotente restrita por `organization_id`.
2. **Quadro 4:** utiliza dados registrados do risco: título extraído do padrão legado `Título:`, campo de impacto separado, probabilidade apresentada como **Não informada** quando ausente, classificação original preservada, mitigação e responsável.
3. **Empresas:** operação de desativação lógica, sem remoção de projetos, clientes, vínculos ou histórico; confirmada por superadmin; proteção de empresas principais; bloqueio quando usuários possuem a empresa ativa; reativação possível.
4. **Notificações:** informações de prioridade e prazo dos responsáveis; atualização ao mudar a empresa.
5. **Ícone:** rotas `/icon` e `/apple-icon`, manifesto; fidelidade ao arquivo oficial e instalação em celulares ainda requerem homologação visual.

## Testes adicionados, ainda sem execução comprovada
- `tests/e2e/release-planning-handoff.spec.ts`
- `tests/e2e/status-report-risk-details.spec.ts`
- `tests/e2e/company-lifecycle.spec.ts`

## Checklist obrigatório para publicação consolidada
- [ ] Typecheck aprovado no SHA candidato.
- [ ] Lint aprovado.
- [ ] Build aprovado.
- [ ] Playwright e testes de isolamento aprovados.
- [ ] Fluxo aprovado com duas contas da mesma empresa e com duas empresas distintas.
- [ ] Confirmar projeto único após cliques/requisições simultâneas.
- [ ] Conferir relatório HTML visualmente em desktop e mobile.
- [ ] Confirmar desativação e reativação de empresa de teste sem perda de dados.
- [ ] Conferir favicon e atalhos Android/iOS com o arquivo oficial aprovado.
- [ ] Verificar quota da Vercel antes do deploy.
- [ ] Conciliar commits próprios de main antes de qualquer promoção (não fazer merge sem autorização).

**Não confundir testes de banco transacionais realizados anteriormente com homologação E2E da Preview.** Esta documentação não aprova a publicação nem a produção.
