# UX-NAV-01 | Sidebar adaptativa e navegação por abas
Data: 12/11/2026
Status: **BACKLOG, NÃO IMPLEMENTAR ATÉ CONCLUSÃO DA HOMOLOGAÇÃO KAIROS-SKILLS-02**.
Projeto: 7Commander. Branch de registro: work/local-kairos-operacional-20261111.
Prioridade: após homologação do Kairos. Sem autorização para deploy ou alteração de produção.

## Objetivo
Ganhar área útil nas rotinas operacionais preservando a navegação. Sidebar com logo e ícones principais compactos (aprox. 64–72 px); expansão para aprox. 240–260 px desloca/recalcula o conteúdo, sem sobreposição em desktop. Persistência de estado. No mobile, drawer sobreposto adequado ao tamanho.

## Navegação em dois níveis
1. **Sidebar global:** Início, Projetos, Scrum, Kanban, Daily, Status Report e Kairos, conforme informação/rotas válidas e papel autorizado. Outras rotinas e grupos surgem ao expandir. Logo e botão recolher/expandir permanecem acessíveis.
2. **Abas contextuais dentro da rotina:** permitem alternar subvisões de um mesmo projeto sem voltar ao menu. Exemplo de projeto: Visão geral | Backlog | Scrum | Kanban | Riscos | Decisões | Status Report. Exemplo Scrum: Visão Geral | Sprints | Backlog | Kanban | Daily, sujeito à arquitetura real.
3. Aba ativa refletida na rota ou query, para link direto, recarregamento e retorno do navegador. Preferência por uma camada de abas por seção; evitar abas aninhadas excessivas.
4. Exibir somente abas autorizadas. Mudança de empresa deve limpar contexto e respeitar proteção de sessão/abas paralelas. Nunca usar localStorage para autorização.
5. Em telas pequenas usar tabs com scroll horizontal acessível ou seletor para evitar recorte; manter indicador de aba ativa e foco do teclado.

## Definição consolidada para a implementação futura
**Sidebar adaptativa e navegação por abas são uma única entrega UX-NAV-01.** Não homologar ou implantar um recurso isoladamente, pois ambos compartilham contexto, rotas e reflow do layout.

**Componentização prevista para avaliação no 7Components:** `AppShell` responsivo, `AdaptiveSidebar` (logo + atalhos, compacto/expandido), `NavigationItem` (estado ativo, ícone, badge e tooltip), `ContextTabs` (aba, overflow, teclado e URL) e `ResponsiveContentArea` (reflow). Nomes são provisórios, não indicam componentes já existentes/adotados.

### Regra de adoção no 7Components
Registrar por enquanto como **candidato de componente** na documentação de planejamento do Commander. Somente após implementação, testes de regressão, acessibilidade e comparação de área útil/tempo de navegação documentados, criar ou atualizar o padrão oficial da biblioteca. Não declarar adotado antes de comprovar benefício. Reutilização futura deverá contemplar 7Service e outros sistemas sem copiar diretamente a lógica de autorização de cada produto.

## Critérios de aceite
- Expansão/recolhimento sem ocultar conteúdo; reflow de tabelas, Kanban, backlog e relatórios.
- Logo, whitelabel, ícones e botões aderentes ao 7Components.
- Teclado, ARIA, tooltip no compacto, foco e reduced-motion.
- Links profundos, back/forward, atualização e persistência correta da aba.
- Não confundir navegação global com tabs locais.
- Preservar permissões viewer, isolamento por empresa e autorização servidor.
- Validar ganho de área, tempo de navegação e regressão antes de adotar no 7Components.
- Realizar somente após encerrar homologação Kairos-SKILLS-02. Não iniciar agora.

## Fora do escopo atual
Nenhuma mudança de código, layout publicado, rota, banco, RLS, API ou 7Components nesta etapa. Documento de backlog apenas.
