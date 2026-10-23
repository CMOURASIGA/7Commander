# SPEC 11 — Contexto integrado Prospect → Oportunidade → Análise

Status: PENDENTE DE IMPLEMENTAÇÃO. Registrada em 23/10/2026 após homologação visual. Não houve deploy, merge ou alteração em develop.

## Defeito funcional
Hoje Requisitos, Pesquisa, Matriz, Decisões e Backlog exigem Projeto, embora na pré-venda um prospect possa ter diversas oportunidades sem projeto de execução. Isso força cadastros desconectados e perda de contexto.

## Contrato proposto
- Prospect: entidade comercial que agrupa oportunidades; não se confunde com cliente contratado.
- Oportunidade: unidade de análise/diagnóstico. Pode existir sem projeto e pertence exatamente a um prospect, preservando autorização pela organização.
- Requisito, evidência pesquisada, avaliação, decisão e backlog pré-venda: vinculados a oportunidade por chave estrangeira validada; quando houver projeto, manter relacionamento sem substituição da origem comercial.
- O contexto selecionado (prospect + oportunidade) permanece ao navegar pelas etapas; não exigir selecionar o projeto repetidamente.
- Permitir várias oportunidades por prospect e distinguir seus baselines e históricos.
- Conversão de prospect/negócio em cliente é explícita, com confirmação humana e preservação dos relacionamentos.
- Gerar projeto somente quando aprovado, ou permitir projeto de diagnóstico independente, sem confundir fase comercial com execução.
- Decisões, pesquisas, requisitos e backlog existentes precisam de plano de migração/backfill não destrutivo; registros legados órfãos aparecem em fila de conciliação em vez de serem apagados.

## Requisitos de implementação
1. Migration aditiva com opportunity_id e FKs adequadas, índices, preservação de organização, restrições de integridade e auditoria. Fazer staging antes de produção.
2. API de seleção/contexto e autorização server-side por organização e oportunidade. Nenhuma transferência cruzada de dados.
3. Páginas: prospect → lista de oportunidades → workspace de oportunidade com abas contextualizadas: Diagnóstico, Requisitos, Pesquisa, Matriz, Decisão, Backlog.
4. Requisitos e pesquisas devem persistir sem projeto no diagnóstico de pré-venda, sem alterar registros aprovados silenciosamente.
5. Evitar queries em cascata; busca sob demanda e paginação.
6. Regras transacionais e idempotência para conversão, decisão aprovada e criação de backlog.
7. Cobertura de testes: duas oportunidades do mesmo prospect sem vazamento; sem projeto; posterior criação de projeto; segurança com usuário não autorizado; histórico e persistência após reload.

## Critérios de aceite
- Dado um prospect com duas oportunidades, o usuário alterna entre elas e cada uma exibe somente seus requisitos, fontes e decisões.
- Na etapa de requisitos, não se exige Projeto quando a oportunidade válida já foi escolhida.
- Pesquisa e matriz partem da mesma baseline da oportunidade, inclusive durante a pré-venda.
- A criação de cliente/projeto posterior não perde vínculos, decisões nem auditoria.
- Alteração não é promovida à develop nem publicada até integrar o lote com outras correções e passar pelo gate de testes.

## Impacto no roteiro atual
Suspender o aceite final de Requisitos, Pesquisa, Matriz, Decisões e Backlog como fluxo de pré-venda conectado até implementar esta SPEC. O CRUD isolado pode ser validado apenas como teste técnico parcial com projeto QA.
