# SPEC — 7Commander Multiempresa / Multi-Tenant V1

Status: PROPOSTA TÉCNICA PARA DESENVOLVIMENTO EM DEVELOP. Não autoriza execução de migrations em produção, nem deploy. Requer aprovação arquitetural e testes de isolamento.

## Intenção operacional
- Uma conta de usuário (auth.users) pode ser membro ativo de múltiplas organizações.
- Ao autenticar, se houver somente uma organização acessível, selecioná-la automaticamente; se houver mais de uma, apresentar seletor. Permitir trocar de organização no cabeçalho sem sair da conta.
- O contexto selecionado é exibido em todas as telas e governa projetos, prospects/oportunidades, Kanban, Minhas pendências, clientes, riscos, decisões, documentos, conhecimento, chat e Voice Room/Kairos, Status Reports, automações e notificações.
- Cada usuário visualiza somente dados das empresas em que possui permissão. 'Minhas pendências' abrange somente a organização selecionada por padrão. Não agregar dados entre empresas silenciosamente.
- Contexto separado de projeto: primeiro organização, depois projeto/prospect/oportunidade. Trocar organização invalida filtros, cache, conversa ativa e projeto anterior.
- Whitelabel: logo e marca da organização selecionada no topo esquerdo. Consult Services mantém marca institucional onde autorizado.

## Estado atual a corrigir
- lib/consult-workspace.ts usa CONSULT_ORG_ID hard-coded. Funções getConsultMemberIds, consultMemberRole, resolveConsultAssignee e serviços dependentes não são multitenant.
- Sessões e APIs validam identidade e projeto, mas não possuem tenant ativo padronizado para toda requisição.
- project_members já suporta compartilhamento, mas não substitui associação projeto -> organização com RLS.
- É necessário auditar tabelas legadas, owner user_id e permissões atuais antes de backfill; não presumir que owner UUID equivale ao tenant UUID.
- Voice Room usa núcleo compartilhado do Kairos, mas as instruções novas devem ser testadas end-to-end e o projeto selecionado deve pertencer à organização ativa.

## Contrato mínimo
1. Organizações: id, nome, status, configurações de marca; organization_members com unique(organization_id,user_id), role, status e audit trail.
2. Todas entidades privadas pertencem a um tenant por FK. Criar migrações incrementais, backfill com relatório de ambiguidades, índices por organization_id e validações NOT NULL após reconciliação.
3. Um único resolvedor server-side do contexto (identity + membership ACTIVE + tenant selecionado); tenant do cliente nunca é suficiente sem validação. Negar acesso de forma segura quando contexto não permitido.
4. Políticas RLS usando associação ativa e escopo de tenant, combinadas com RBAC interno (admin, gestor, colaborador, leitor) e papéis específicos por projeto.
5. Chaves compostas/validações de FK impedem relacionar atividade de uma organização a prospect, projeto ou membro de outra.
6. APIs, queries, RPC, storage e jobs sempre filtram por tenant. Não usar fallback para a organização default em falhas de autenticação/autorização.
7. Voice/chat/Kairos: prompts, memories, vector search, histórico e documentos precisam de organization_id; não permitir mistura de empresas.
8. Status Report HTML: somente informações da empresa/projeto selecionados, com identificação da empresa emissora; aplicar whitelabel por tenant.
9. Auditoria: tenant, ator, ação, alvo e timestamp; quotas, rate limits e segregação das integrações conforme contrato.
10. Dados existentes da Consult Services migram sem perda por procedimento reversível (dry-run, contagens antes/depois, backups, validação).

## Experiência
- Seletor de empresa pós-login e no menu superior. Sem qualquer vínculo ativo: mensagem de acesso não autorizado.
- Mudança de empresa reseta caches e retorna ao dashboard do tenant.
- Projeto é selecionado depois da empresa. Kanban mantém filtro por contexto e visão do responsável/criador dentro da organização.
- Minhas pendências por empresa, com filtros Minhas, Delegadas e Criadas por mim.
- Administração de empresa permite convidar e revogar membros; sem conceder privilégio global por padrão.
- Configuração de marca isolada por empresa.

## Estratégia de execução sem risco de contaminação
CP-01 inventário da base e ADRs de isolamento; CP-02 migrations e RLS com dados sintéticos em executor isolado; CP-03 API de contexto e membership; CP-04 UX seletor; CP-05 migração dos módulos core; CP-06 Kairos/Voice + relatórios + notificações + storage; CP-07 E2E cross-tenant, regressão e migração controlada.
Testes obrigatórios: tenant A não lista/lê/grava recursos de B; URL/id forjado retorna 403/404; troca de empresa não mantém cache ou resposta de Kairos anterior; convite/revogação; múltiplos perfis; sem regressão na Consult Services.
Não criar banco novo sem autorização explícita. Não testar dados fictícios no banco de produção. Conservar política corporativa: desenvolver na develop, publicar somente após lote mínimo de 6 entregas concluídas/testadas e autorização.
