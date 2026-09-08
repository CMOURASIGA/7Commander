# Kairos Executive Dashboard

## Objetivo

Registrar a evolução conceitual do Kairos para que ele deixe de atuar apenas no contexto isolado de cada projeto e passe também a analisar o 7Commander como um portfólio completo.

Esta branch é de descoberta e especificação. Não altera o comportamento consolidado atual do sistema.

## Conceito central

O Kairos passa a operar em dois níveis complementares:

### 1. Kairos Projeto

Mantém o comportamento atual orientado ao projeto selecionado.

Responsabilidades:
- analisar tarefas, riscos, decisões e conhecimento do projeto;
- apoiar planejamento e execução;
- registrar decisões, riscos, conhecimento e atividades;
- manter contexto conversacional do projeto.

### 2. Kairos Executivo

Novo nível transversal ao 7Commander.

Responsabilidades:
- analisar todos os projetos acessíveis ao usuário;
- comparar projetos e identificar deterioração, recuperação e tendências;
- apontar prioridades;
- identificar riscos compartilhados;
- detectar dependências cruzadas;
- sinalizar concentração de trabalho e possíveis gargalos;
- comparar a situação atual com períodos anteriores;
- apresentar opinião gerencial fundamentada;
- recomendar ações e explicar as evidências usadas.

## Dashboard inicial

A proposta é que a abertura do 7Commander deixe de ser apenas um dashboard de indicadores e passe a responder primeiro:

> Como está minha operação hoje?

Blocos sugeridos:

1. Saudação e briefing do Kairos
2. Saúde geral do portfólio
3. Minha avaliação
4. O que mudou
5. Minhas recomendações
6. Algo que você pode não estar percebendo
7. Projetos que exigem atenção
8. Campo de conversa com o Kairos sobre toda a operação

## Princípio de experiência

Priorizar:

```
dados -> Kairos analisa -> conclusão -> evidências -> investigação
```

em vez de:

```
dados -> gráficos -> usuário interpreta sozinho
```

O dashboard tradicional não deve ser removido. Ele passa a funcionar como camada de evidência e exploração.

## Análises esperadas

O Kairos Executivo deve conseguir responder perguntas como:

- Qual projeto estou negligenciando?
- Qual projeto apresenta maior risco de atraso?
- Onde existe concentração de esforço?
- Existem dependências comuns entre projetos?
- O que piorou desde ontem?
- O que melhorou nos últimos 7 dias?
- Qual projeto exige minha intervenção agora?
- Se eu precisasse reduzir prioridade de dois projetos, quais seriam?
- Existe algum risco que eu provavelmente não estou percebendo?
- Olhando o 7Commander como um todo, qual é sua opinião?

## Dimensão temporal

A análise deve considerar evolução e não apenas fotografia atual.

Janelas iniciais sugeridas:
- hoje;
- desde a última abertura;
- 7 dias;
- 30 dias.

Exemplo:

> A situação geral melhorou desde a semana passada, mas o risco do Projeto X aumentou pelo terceiro período consecutivo.

## Evidência e explicabilidade

Toda opinião ou recomendação relevante deve permitir rastrear a origem.

Exemplo:

> Projeto X exige atenção devido a atraso de tarefas críticas, dois riscos abertos sem mitigação e queda de progresso nas últimas duas semanas.

A interface deve permitir abrir os dados que sustentaram a conclusão.

## Futuro: Connector Layer

Não implementar nesta etapa, mas preservar o desenho para que o Kairos possa futuramente analisar fontes externas além do banco do 7Commander.

Conectores candidatos:
- GitHub;
- Vercel;
- Google Drive;
- Supabase;
- Gmail;
- Calendar.

Arquitetura conceitual:

```
Kairos
  |
  +-- Context Engine
  +-- Portfolio Intelligence
  +-- Connector Registry
  +-- Permission Engine
  +-- Evidence / Audit
```

## Guardrails

- respeitar RBAC e escopo de dados do usuário;
- nunca apresentar como fato uma inferência sem evidência;
- distinguir dado, tendência, hipótese e recomendação;
- permitir ao usuário abrir a evidência;
- não substituir decisões humanas de gestão;
- manter Kairos Projeto funcional e independente;
- não degradar chat, voz ou ações já consolidadas.

## Próxima etapa

Antes de implementar:

1. mapear como o dashboard inicial atual obtém seus dados;
2. mapear o contexto disponível hoje para o Kairos;
3. identificar quais dados são apenas por projeto e quais já podem ser agregados;
4. definir modelo de Portfolio Snapshot;
5. definir critérios de saúde, tendência e criticidade;
6. definir contrato de resposta do Kairos Executivo;
7. prototipar o dashboard inicial;
8. validar UX e conteúdo antes de alterar o fluxo principal.

## Status

IDEIA REGISTRADA - NÃO IMPLEMENTAR AINDA

Branch criada exclusivamente para amadurecimento e posterior especificação técnica.
