# ROTEIRO DE HOMOLOGAÇÃO — 7Commander (develop)

**Status:** aguardando build e validação humana. Não usar dados confidenciais antes de validar autorizações.

## Preparação
- Confirmar URL Preview da branch develop e SHA efetivamente implantado, nunca usar Preview anterior.
- Entrar em sessões separadas como Superadmin e Gestor Rodrigo; testar também Leitor.
- Criar cliente/projeto fictícios QA e anotar seus identificadores. Não usar o projeto real Movimentar-se para testes destrutivos.
- Registrar em cada teste: PASS/FAIL, usuário, URL, print, timestamp, comportamento esperado/observado.

## A — Login e acesso
- [ ] A1. Superadmin entra por e-mail/senha; aparece na lista administrativa, protegido contra suspensão.
- [ ] A2. Gestor entra; não pode chamar GET/POST/PATCH /api/admin/users (403), nem acessar funcionalidades restritas.
- [ ] A3. Usuário Leitor não grava projetos, tarefas ou riscos via UI/API.
- [ ] A4. Sessão suspensa não usa endpoints autenticados; logout encerra acesso.
- [ ] A5. Duplicidade de e-mail na tela de usuário retorna erro claro.

## B — Workspace e desempenho
- [ ] B1. Lista compacta seleciona projetos sem renderizar cards de todos.
- [ ] B2. Abrir /projects: inspecionar Network; riscos, conhecimentos, decisões e membros NÃO são carregados antes da abertura da respectiva seção.
- [ ] B3. Alternar entre 3 projetos rapidamente; nenhum dado do projeto anterior aparece indevidamente.
- [ ] B4. Simular falha de /api/projects/active; seleção anterior é restaurada, erro aparece.
- [ ] B5. Atualizar lista com falha simulada; registros existentes não desaparecem.
- [ ] B6. Registrar tempo e número de requisições (Network) com 2 e 30 projetos; comparar após otimizações, sem presumir melhoria.

## C — Clientes e projetos compartilhados
- [ ] C1. Superadmin cria cliente fictício; Gestor vê e edita.
- [ ] C2. Gestor cria projeto associado; Superadmin vê e modifica, preservando vínculo.
- [ ] C3. Testar isolamento: usuário de outra organização NÃO enxerga nem edita projetos da Consult.
- [ ] C4. Arquivar projeto: sumário marcado arquivado, informações preservadas.
- [ ] C5. Gerenciar projetos: exclusão de QA sem tarefas/conversas, com confirmação exata do nome; confirmar que riscos de teste e quadro vazio são removidos.
- [ ] C6. Exclusão de projeto real com tarefas/conversas é BLOQUEADA; nada é perdido.

## D — Kanban, responsáveis e notificações
- [ ] D1. Criar card em projeto compartilhado e escolher Rodrigo na lista de usuários ativos.
- [ ] D2. Salvar, observar Salvando... depois sucesso; fechar/reabrir confirma persistência.
- [ ] D3. Rodrigo vê o card no Kanban, a pendência no sino e o banner na página inicial.
- [ ] D4. Rodrigo atribui outro card ao Superadmin, que recebe avisos equivalentes.
- [ ] D5. Concluir card: após refresh/foco, pendência sai dos alertas.
- [ ] D6. Alternar aba por mais de 1 minuto: não deve haver polling em segundo plano.
- [ ] D7. Falha de gravação: mensagem de erro, dados não são tratados como salvos.
- [ ] D8. Usuário suspenso ou removido da organização não pode ser novo responsável.

## E — Kairos e riscos
- [ ] E1. Pedir 7 riscos estruturados; Direcionar resposta > Risco mostra 7 registros editáveis individuais.
- [ ] E2. Desmarcar 1 risco; somente 6 são gravados.
- [ ] E3. Confirmar títulos/descritivos corretamente separados no projeto ativo.
- [ ] E4. Repetir a mesma resposta: a API rejeita título duplicado; avaliar tratamento de falha parcial.
- [ ] E5. Gestor vê os riscos criados pelo Superadmin e vice-versa.
- [ ] E6. Próximos passos e recomendações não devem virar riscos por engano.

## F — Regressão e gate de produção
- [ ] F1. Build/typecheck/lint/teste automatizado com SHA registrado e sem erros novos.
- [ ] F2. Interface desktop e mobile, inclusive modal Kairos, Projetos e card Kanban.
- [ ] F3. Confirmar Preview, demo e produção isolados; nenhuma publicação na main por engano.
- [ ] F4. Dados sensíveis/segredos não expostos no client bundle nem em logs.
- [ ] F5. Revisar criação/atribuição/alteração simultânea nas duas contas.
- [ ] F6. Revisar backup e procedimento de rollback.

**Pendências fora deste pacote de correções:** SPEC 01-05 são módulos de produto completos (prospects, requisitos, pesquisa externa, aderência, orquestração) e exigem implementação e testes próprios. Não confundir SPEC aprovada com produto entregue.
