# Matriz de paridade, Commander Demo

Data de referência: 26/11/2026  
Frontend de referência: `main` no commit `e9d673d42fcece5d06551613b16d5b23a5b8edd5`

| Área | Paridade esperada | Persistência | Verificação |
|---|---|---|---|
| Identidade visual, navegação e responsividade | Mesmo frontend de produção | Não aplicável | Build aprovado, homologação desktop/mobile |
| Login e logout | Fluxo local simples, sem Access ou e-mail | LocalStorage | E2E |
| Multiempresa | Nuvora, Vértice e Lúmina, com isolamento por `organization_id` | LocalStorage | E2E |
| Perfis e permissões | Capacidades simuladas, perfil proprietário na apresentação | LocalStorage | Contrato de API |
| Clientes e projetos | Consulta, inclusão, edição e exclusão | LocalStorage | E2E e contrato de API |
| Stakeholders e membros | Mesmos componentes, registros fictícios relacionados | LocalStorage | Teste funcional |
| Dashboard e indicadores | Recalculados a partir de projetos, tarefas e riscos locais | LocalStorage | Teste funcional |
| Scrum, Sprints, US e Backlog | Consulta e operações de estado | LocalStorage | Contrato de API e teste funcional |
| Kanban, Daily e atividades | Movimentação, responsáveis, prazos e persistência | LocalStorage | Teste funcional |
| Riscos e decisões | CRUD e relacionamento com projeto | LocalStorage | Teste funcional |
| Reuniões e compromissos | Consulta, inclusão e vínculos fictícios | LocalStorage | Teste funcional |
| Notificações | Massa local isolada por empresa | LocalStorage | Teste funcional |
| Status Report cliente/equipe | Mesma tela e dados operacionais locais | LocalStorage | Teste funcional e exportação |
| PDF e HTML | Recursos do navegador, sem backend externo | Download local | Teste funcional |
| Kairos e integrações externas | Resposta local identificada como simulada | LocalStorage | Teste funcional |
| Configurações e ajuda | Orientação de demonstração e restauração confirmada | LocalStorage | E2E |
| Segurança | Sem Supabase, credenciais ou dados reais | Não aplicável | Varredura de código e rede |
| Build de produção | Next.js otimizado | Não aplicável | Aprovado |

## Evidências técnicas

- `npm run typecheck`: aprovado.
- `npm run build` com modo demo: aprovado.
- Massa fictícia: 3 empresas, 13 usuários, 6 clientes, 6 projetos, 18 Sprints, 48 User Stories, 60 itens de backlog, 36 atividades, 18 riscos, 12 decisões e 12 reuniões.
- O E2E automatizado está em `tests/e2e/demo-localstorage.spec.ts` e cobre autenticação, persistência após recarga, isolamento multiempresa e restauração.

