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

## INCIDENTE CONFIRMADO EM 21/10/2026 - LOGIN INOPERANTE (P0 BLOQUEANTE)
Relato de validacao humana: deploy no Vercel nao permite concluir login. Incidente reproduzido pelo usuario; causa tecnica ainda NAO determinada. Estado operacional: BLOCKED / NOT PRODUCTION READY. Nao declarar PASS por deploy READY ou banco HEALTHY.

### Infraestrutura identificada sem alteracoes
Supabase preexistente: ref `pmituaahaqimvhzhqsry` (nome `7Commander_oficial`, regiao sa-east-1), estado ACTIVE_HEALTHY na verificacao de 21/10/2026. Inventario de 37 tabelas public, com RLS habilitado; nao comprova policies ou transacoes autorizadas. Reutilizar este projeto, sujeito a validacao das configuracoes e do ambiente correto, em vez de recriar DB.
Vercel: foram encontrados tres projetos `7-commander`, `7-commander-demo`, `7-commander-oficial`. NAO assumir qual URL/branch aponta para cada um; identificar dominios, aliases, target, project ID, Git branch, SHA e secrets por ambiente antes de ajustes.

### Nova fase obrigatoria 00A - Restabelecimento do login
00A-01 Inventariar URL exata com falha, projeto Vercel, deployment, branch/SHA, logs runtime e erro observado na interface/rede. Segregar causa demonstrada de hipotese.
00A-02 Conferir envs do deployment correspondente sem expor valores: NEXT_PUBLIC_SUPABASE_URL deve apontar para `https://pmituaahaqimvhzhqsry.supabase.co`; conferir chave publica deste MESMO projeto, service role server-only e NEXT_PUBLIC_APP_URL coerente; revisar configuracao exigida de auth e ausencia de valores dev/mock. Registrar divergencias apenas por identificador e status, nunca credenciais.
00A-03 Conferir Supabase Auth: providers habilitados, usuarios autorizados, URLs do site e redirects/callbacks permitidos por ambiente, expiracao de sessao, cookies e comportamento browser; verificar logs dos erros sem divulgar tokens.
00A-04 Auditar fluxo real frontend -> Supabase Auth -> API /api/auth/profile -> area autenticada e integracao do header Bearer; validar login, refresh, logout, bloqueio nao autenticado e tentativa de acesso de outro usuario.
00A-05 Acessar dados do banco existente apenas com operacoes de leitura; inventariar migrations, constraints, grants, RLS/policies e correspondencia com a versao implantada. Nenhuma migration, limpeza, seed ou alteracao de provider sem autorizacao e plano de reversao.
00A-06 Criar correcao em branch de hotfix e PR com testes; nao publicar automaticamente. Validar smoke de login no preview com o mesmo SHA, depois producao controlada com monitoramento e rollback.
00A-07 Gate de saida: login PASS no desktop e mobile, usuario A/B isolados, refresh e logout PASS, cadastro/leitura de cliente e projeto PASS no Supabase, logs sem erro critico e evidencias por SHA + URL + data.

### Dependencia das fases
00A antecede os demais gates da SPEC 00 e toda entrada de prospect/cliente real. SPEC 01-05 permanecem planejamento. Nao usar servico de banco saudavel como prova de aplicacao funcional.

### Evidencias complementares Vercel e Supabase (21/10/2026)
- O projeto Vercel `7-commander` registra deploys automaticos a partir da branch documental desta SPEC; esses PREVIEWS NAO sao ambiente homologado, nem evidenciam login funcional.
- O projeto Vercel `7-commander-oficial` tem deployment READY ligado ao repositorio GitHub **CMOURASIGA/7Commander_oficial**, branch `feature/kairos-unification-v2`, SHA `5eff9e2845b04ce7831d1048e828ac8bf98ae841`. Distinguir explicitamente desse repositorio `CMOURASIGA/7Commander`. Verificar qual dos dois representa a aplicacao que o usuario tentou acessar.
- Avisos de seguranca Supabase identificados: tabelas `project_permissions`, `task_checklist_items` e `task_columns` com RLS habilitado sem policy; funcoes `match_memories` e `touch_profiles_updated_at` com search_path mutavel; funcoes SECURITY DEFINER de organizacao/plataforma expostas a `anon` e `authenticated`; extensao vector em public. Avaliar severidade efetiva, nao aplicar ALTER/REVOKE cegamente, preservar funcionalidades e testar com usuarios A/B.
- Fontes oficiais de remediacao: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable e https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
