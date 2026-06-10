# 7C Commander - Roteiro de Teste E2E (Colaborador Sem Contexto)

## 1) Objetivo deste roteiro
Validar o fluxo completo do sistema, do cadastro inicial ate a gestao de artefatos e fechamento do ciclo.

Este roteiro foi escrito para quem **nao conhece o sistema**.

---

## 2) Tempo estimado
- Execucao completa: 45 a 70 minutos

---

## 3) O que voce precisa antes de iniciar

### 3.1 Ambiente
- Ter acesso ao computador com o projeto local.
- Ter acesso a internet (para abrir links externos e GitHub, se necessario).

### 3.2 Subir o sistema local
No terminal, dentro da pasta do projeto:

```powershell
npm install
npm run dev
```

Depois disso, abrir no navegador o endereco exibido no terminal (normalmente `http://localhost:5173`).

---

## 4) Dados padrao para o teste
Use exatamente estes dados para facilitar a validacao:

- Cliente (nome): `E2E Cliente Validacao`
- Cliente (descricao): `Cliente criado para teste ponta a ponta`
- Cliente (responsavel): `Colaborador QA`
- Cliente (observacoes): `Teste completo E2E`

- Projeto (nome): `E2E Projeto Validacao`
- Projeto (objetivo): `Validar fluxo completo do sistema`
- Projeto (descricao): `Projeto criado para validar CRUD, tema, workspace e artefatos`
- Projeto (responsavel): `Colaborador QA`
- Projeto (fase): `Descoberta`
- Projeto (proximo passo): `Criar primeiro artefato`
- Stakeholders: `Diretoria, Operacoes, TI`

- Datas:
  - Data de inicio: escolha pelo calendario
  - Data final prevista: escolha pelo calendario (ex: +30 dias)

- Artefato:
  - Nome: `E2E Artefato 01`
  - Conteudo inicial: `Conteudo inicial do artefato E2E`
  - Conteudo editado: `Conteudo editado do artefato E2E`
  - Link externo: `https://example.com`

---

## 5) Cenario E2E (passo a passo)

## Etapa A - Login e acesso inicial
1. Abrir o sistema no navegador.
2. Fazer login (ou entrar como usuario local, conforme ambiente).
3. Confirmar que o menu lateral aparece com: Inicio, Clientes, Projetos, Artefatos, Agentes, Ajuda, Configuracoes.

**Esperado:** sistema abre sem erro e mostra dashboard/menu.

---

## Etapa B - Clientes (CRUD por icones)
1. Ir em **Clientes**.
2. Clicar em **Novo cliente** e preencher os dados padrao do cliente.
3. Salvar.
4. Na lista em formato card, localizar o cliente criado.
5. Testar icones do card:
   - `olho`: visualizar dados do cliente.
   - `lapis`: editar (alterar descricao para `Cliente E2E atualizado`) e salvar.
   - `lixeira`: **nao excluir ainda** (vamos validar regra de bloqueio depois).
6. Testar busca digitando `E2E Cliente`.

**Esperado:**
- Cliente aparece em card.
- CRUD com icones funciona.
- Busca encontra o cliente.

---

## Etapa C - Projetos (card + abrir workspace + data com calendario)
1. Ir em **Projetos**.
2. Clicar em **Novo projeto**.
3. Preencher dados padrao do projeto.
4. No campo de data, usar o **botao de calendario** para escolher as datas (inicio e fim).
5. Salvar.
6. Confirmar que o projeto aparece em **card**.
7. Testar icones do card:
   - `olho`: visualizar projeto.
   - `lapis`: editar e salvar (mudar proximo passo para `Revisar artefatos`).
   - `pasta`: abrir workspace.

**Esperado:**
- Projeto criado com sucesso.
- Datas escolhidas pelo seletor de calendario.
- Acoes do card funcionam por icones.

---

## Etapa D - Regra de negocio: exclusao de cliente com projeto vinculado
1. Voltar para **Clientes**.
2. No cliente `E2E Cliente Validacao`, clicar no icone `lixeira`.

**Esperado:**
- Sistema deve bloquear exclusao e mostrar mensagem informando que o cliente possui projetos vinculados.

---

## Etapa E - Workspace (tema/contraste + cards de informacao)
1. Abrir o workspace do projeto `E2E Projeto Validacao`.
2. Na area superior (cards de Cliente, Status, Fase, etc.), validar que os cards estao com fundo destacado.
3. Mudar para **tema escuro** (menu lateral).
4. Validar se textos ficam legiveis (sem texto escuro em fundo escuro).
5. Mudar para **tema claro**.
6. Validar se textos ficam legiveis (sem texto claro em fundo claro).

**Esperado:**
- Cards de informacao com destaque visual.
- Contraste correto em ambos os temas.

---

## Etapa F - Artefatos no workspace (drawer + editar + versionar + excluir)
1. No workspace, ir na aba **Artefatos**.
2. Clicar em **Novo artefato**.
3. Validar que abre em **drawer lateral** (nao em prompt simples).
4. Preencher:
   - Nome: `E2E Artefato 01`
   - Conteudo: `Conteudo inicial do artefato E2E`
   - Link externo: `https://example.com`
5. Salvar.
6. No card/tabela de artefatos, testar icones:
   - `olho`: visualizar detalhes/preview.
   - `lapis` (ou editar): editar conteudo para `Conteudo editado do artefato E2E` e salvar.
   - `nova versao`: criar uma nova versao do artefato com conteudo diferente.
   - `link externo`: abrir URL cadastrada.
7. Criar um segundo artefato rapido (nome `E2E Artefato Excluir`) e depois exclui-lo no icone `lixeira`.

**Esperado:**
- Criacao via drawer funcionando.
- Edicao e nova versao funcionando.
- Link externo abre a URL cadastrada.
- Exclusao de artefato funcionando.

---

## Etapa G - Biblioteca de artefatos por projeto
1. Ir no menu **Artefatos**.
2. Validar que a tela mostra **cards de projetos**.
3. No card do projeto `E2E Projeto Validacao`, clicar no icone para abrir.
4. Confirmar que abre uma nova tela com artefatos somente desse projeto.
5. Abrir/editar um artefato nessa tela para confirmar funcionamento.

**Esperado:**
- Organizacao por projeto funcionando.
- Tela de detalhe por projeto funcionando.

---

## Etapa H - Fechamento do ciclo (cleanup)
1. Ir em **Projetos** e excluir o projeto `E2E Projeto Validacao`.
2. Ir em **Clientes** e excluir o cliente `E2E Cliente Validacao`.
3. Validar que ambos nao aparecem mais nas buscas.

**Esperado:**
- Projeto excluido com sucesso.
- Cliente agora pode ser excluido (pois nao ha mais projeto vinculado).

---

## 6) Checklist final de aprovacao
Marque cada item como OK ou NOK:

- [ ] Login e acesso inicial funcionando
- [ ] Tela de clientes em card com CRUD por icones
- [ ] Tela de projetos em card com CRUD por icones
- [ ] Botao de calendario funcionando nas datas do projeto
- [ ] Botao de abrir workspace funcionando no card de projeto
- [ ] Cards de informacao do workspace com destaque visual
- [ ] Contraste correto no tema claro
- [ ] Contraste correto no tema escuro
- [ ] Criacao de artefato via drawer funcionando
- [ ] Edicao de artefato funcionando
- [ ] Nova versao de artefato funcionando
- [ ] Exclusao de artefato funcionando
- [ ] Link externo do artefato funcionando
- [ ] Tela de artefatos organizada por projeto funcionando
- [ ] Fluxo ponta a ponta concluido com limpeza final dos dados de teste

---

## 7) Como registrar bug (se encontrar)
Para cada problema encontrado, registrar:

1. Titulo curto do bug
2. Passos exatos para reproduzir
3. Resultado obtido
4. Resultado esperado
5. Print de tela/video
6. Ambiente (local, navegador, data/hora)

Modelo rapido:

```text
BUG:
Passos:
Resultado obtido:
Resultado esperado:
Evidencia:
```

---

## 8) Resultado final do teste
Preencher ao concluir:

- Data do teste:
- Nome do colaborador:
- Resultado geral: APROVADO / REPROVADO
- Quantidade de bugs:
- Observacoes finais:
