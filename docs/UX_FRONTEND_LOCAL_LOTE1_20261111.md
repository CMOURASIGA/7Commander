# UX-FRONTEND-LOCAL | Primeiro lote aplicado à interface (11/11/2026)

Branch exclusiva: `work/local-kairos-operacional-20261111`.

Implementado:

- **DASH-PROJ-01 (primeira entrega):** aba Visão geral inicial em `/projects`, cabeçalho de projeto com troca contextual e link Status Report, abas com contadores, 4 indicadores, riscos com severidade e mitigação expansível, matriz 3x3 filtrável, stakeholders agrupados, últimas decisões, documentos recentes e painel lateral de conteúdo processado.
- **UX-HOME-01 (primeira entrega):** cabeçalho de carteira e acessos claros a Projetos, Clientes, Scrum e Atividades, preservando indicadores e pendências atuais.
- **UX-CLIENT-01 (primeira entrega):** pesquisa por texto, filtro ativo/inativo, botão Adicionar cliente e editor lateral para criar/editar, mantendo rotas e permissões existentes.

Conservação: API/CRUD existentes não foram substituídos. Sem alteração de esquema SQL, Supabase, Vercel, develop ou main. Dados são obtidos das APIs autorizadas já existentes. A matriz aceita apenas valores 1/2/3 ou Baixo/Médio/Alto; riscos sem classificação entram em Não avaliado. Indicador de riscos não é uma medida completa da saúde do projeto, pois prazos e escopo não estão considerados.

Pendente, **não afirmar que foi entregue**:

- Storage privado/download do documento original, DOC-PROJ-01.
- Ajustes completos nas telas Scrum, Backlog, Kanban, Daily, Atividades, Prospect, Central de Decisões, Status Report, Kairos, Memória e Configurações.
- Validação técnica e visual no Windows (typecheck, lint, testes, build e verificação responsiva).
- Homologação de operações de CRUD com RLS real e garantia de autorização de viewer.
- Layout com todas as interações do HTML protótipo; o frontend real representa apenas as primeiras implementações.

Executar localmente:

```powershell
cd C:\Projetos\7Commander-local
git pull --ff-only origin work/local-kairos-operacional-20261111
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run dev -- --hostname localhost --port 3100
```

Acessar `/projects`, `/` e `/clients`, sem realizar testes destrutivos com registros de produção. Imagens e textos demonstrativos do protótipo não são usados para substituir registros reais.
