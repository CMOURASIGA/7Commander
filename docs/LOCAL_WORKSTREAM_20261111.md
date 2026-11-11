# 7Commander | Backlog operacional e Kairos | 2026-11-11

## UX-PROJ-01 | Cadastro sob demanda em Riscos e Decisões

Status: PENDENTE DE IMPLEMENTAÇÃO
Escopo: operacional, independente das mudanças do Kairos.
Origem: validação visual do projeto Prosperitá em 2026-11-11.

### Problema
As abas Riscos e Decisões exibem formulários de criação permanentemente, reduzindo a área de leitura e acompanhamento dos registros cadastrados.

### Comportamento esperado
- Ao acessar Riscos, exibir os riscos cadastrados e um botão `+ Criar risco`; não exibir o formulário inicialmente.
- Ao acessar Decisões, exibir as decisões cadastradas e um botão `+ Criar decisão`; não exibir o formulário inicialmente.
- Abrir a criação em drawer lateral com os componentes de UI existentes, preservando acessibilidade, responsividade, whitelabel e permissões owner/editor/viewer.
- Cancelar fecha o drawer sem salvar; salvar com sucesso atualiza a lista e fecha o drawer; falha mantém o formulário aberto com mensagem útil.
- Abrir edição em drawer com dados carregados; preservar regras e APIs existentes.
- Não criar dados na mudança de aba nem ao abrir/fechar o drawer.
- Respeitar status, mitigação, vínculos, auditoria e validações atuais dos módulos.

### Critérios de aceite
1. Lista visível e formulário oculto por padrão nos dois módulos.
2. Botões de criação consistentes com o 7Components.
3. Criar, editar, cancelar e tratar erros sem navegação ou refresh completo.
4. Viewer não consegue gravar nem por API.
5. Dados são restritos ao projeto/tenant ativo.
6. Regressão de Riscos, Decisões, Status Reports e Kairos sem mudanças de comportamento.
7. Aprovação local -> develop -> produção, sempre por PR e gates.

## KAIROS-CORE-01 | Pendências da homologação HV-02 a HV-05

Status: PENDENTE, NÃO PUBLICAR EM PRODUÇÃO.
- Separar análise e operação de escrita; intenção inequívoca e consentimento explícito para criar/alterar/excluir.
- Recuperar evidências reais dos módulos Riscos, Decisões, Backlog, Kanban com IDs verdadeiros e status de consulta.
- Diferenciar dados encontrados, vínculos formais, inferências e dados indisponíveis.
- Não fabricar IDs ou afirmar consultas que não foram executadas.
- Matriz de criticidade coerente com o Commander e Markdown renderizado.
- Testes automatizados com casos de análise somente leitura, inclusive prompts com verbos de criação citados.

## Fluxo de trabalho
`work/local-kairos-operacional-20261111` -> validações locais -> PR para `develop` -> homologação publicada -> autorização explícita -> PR/release seletiva para `main`.
Não realizar merge integral de `develop` para `main` quando o novo Kairos ainda estiver pendente.
