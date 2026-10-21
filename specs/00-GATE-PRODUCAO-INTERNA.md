# SPEC 00 - Gate de producao interna | 7Commander
Status: PROPOSTA, NAO HOMOLOGADA. Prioridade P0. Base: develop (21/10/2026).

## Objetivo
Permitir uso interno pela Consult Services para registrar prospects, clientes, projetos e requisitos REAIS, com seguranca, disponibilidade e recuperacao de dados comprovadas. O novo modulo de pesquisa NAO e dependencia desse gate.

## Constatações na base
- Existem /api/clients, /api/projects, services de persistencia Supabase e Auth Supabase.
- lib/api-auth.ts aceita modo legacy com KAIROS_API_KEY e x-kairos-user-id; quando auth nao e obrigatoria, permite identidade pelo header/default.
- lib/supabase/server.ts usa SUPABASE_SERVICE_ROLE_KEY, contornando RLS. Revisar TODAS as rotas e services quanto a autorizacao contextual.
- services/client-service.ts e project-service.ts possuem fallback Map em memoria quando KAIROS_ENABLE_LOCAL_FALLBACK=true.
- develop e main divergiram (comparacao em 21/10/2026: develop 1 commit a frente e 5 atras de main). Nao presumir que a branch de deploy possui as correcoes.

## Requisitos mandatórios
P0-01 Inventariar branch/SHA efetivamente implantados, Vercel, Supabase, variaveis e migrations; comparar main e develop e reconciliar em PR sem force push.
P0-02 Auth obrigatoria em producao, identidade derivada EXCLUSIVAMENTE de sessao validada; bloquear KAIROS_AUTH_REQUIRED=false, identity headers/default e chaves legacy para acessos de usuario. Integracoes tecnicas apenas por credenciais dedicadas e escopos minimos.
P0-03 Aplicar autorizacao no servidor para todas as operacoes e recursos: cliente, projeto, membro, tarefa, risco, decisao, documentos, chat, memoria, ingestao, IA e integracoes. Testes A/B de acesso cruzado negado. Auditar uso de service role, definir policy/RLS efetiva e checagens transacionais.
P0-04 Separar ambientes DEV/DEMO/PROD e bancos/segredos. PROD nao contem fixtures, mocks ou fallback transitorio; falha de banco devolve erro e nao resposta vazia enganosa.
P0-05 Verificar migrations e integridade referencial, backups e teste REAL de restauracao, log de falhas, trilha de auditoria e monitoramento/alertas.
P0-06 Testar CRUD, acesso compartilhado, upload, alteracao, exclusao, expiracao de sessao, navegador desktop/mobile e fluxos de erro. Executar typecheck, lint, build, testes automatizados e smoke E2E na mesma revisao que sera publicada.
P0-07 Validar regras LGPD para dados de prospects: finalidade, perfil de acesso, retencao, exportacao, exclusao e minimizacao de dados enviados a provedores de IA.
P0-08 Definir rollback com SHA, procedimento de incidente e responsavel pela operacao; confirmar custos/limites OpenAI, storage e APIs.

## Aceite
Gate PASS somente com matriz de evidencias (ambiente, SHA, data, responsavel, resultado) e ausencia de falha critica/alta. Gate FAIL bloqueia informacoes reais, mesmo que preview funcione. Aprovar producao interna limitada ANTES de acesso externo de clientes. Nao executar merge, deploy ou migracao no escopo desta SPEC de planejamento.