# INT-01 | Release readiness | 2026-11-05

## Decisão

**NO-GO para o 7Commander integrado ao 7Service em produção com clientes reais.**
Não executar merge `develop -> main` nem ativar autorização central em produção até todos os gates abaixo estarem PASS e existir autorização expressa para publicação. A versão do piloto QA em `develop` não é uma liberação comercial.

## Evidências aprovadas

- 7Service `develop`: endpoint de decisão de acesso via Bearer e fluxos funcionais de homologação.
- 7Commander `develop`: login local, segunda confirmação no 7Service, autorização central, identificação da organização QA e segregação visual do VIEWER.
- Auditoria de autorização: `projects.view`, `clients.view`, `tasks.view`, `organizations.view` permitidos para o piloto; escritas como `POST /api/clients` negadas.
- UI do piloto: Clientes e Atividades em modo leitura e estado vazio correto; revisão das rotinas secundárias de Projetos iniciada.
- Regressão automatizada: `tests/int01-release-security.test.mjs` e workflow `int01-release-gates.yml`.

## Bloqueios de produção

| ID | Gate | Situação | Condição de saída |
| --- | --- | --- | --- |
| REL-01 | Login único / provisionamento | BLOCKED | Uma identidade 7Service inicia sessão reconhecida pelo Commander sem segunda credencial manual; vínculo UUID verificado no servidor, revogação e expiração comprovadas; RLS mantido |
| REL-02 | Segregação multempresa | PARTIAL | Testes automatizados de negação cruzada para duas empresas reais de QA, com rollback e auditoria; nenhuma leitura ou escrita cruzada |
| REL-03 | Matriz API VIEWER | PARTIAL | Cobertura negativa das rotas críticas e sem permissões amplas só para eliminar HTTP 403; confirmar comportamento de perfil, conversas e rotinas secundárias |
| REL-04 | Produção 7Service | BLOCKED | Variáveis de produção, Auth, Supabase, domínio, health/ready e segredos separados dos ambientes QA |
| REL-05 | Produção 7Commander | BLOCKED | Integração M2M/central e mapeamentos de clientes produtivos; nenhuma credencial QA ou pilot-org id de homologação |
| REL-06 | Divergência Git | BLOCKED | Reconciliar os seis commits presentes em main e ausentes de develop sem sobrescrever integrações e regressões |
| REL-07 | Gates de release | PENDING | Lint, typecheck, build, testes de autorização, RLS/IDOR e smoke real de ambiente produtivo, todos PASS no mesmo SHA |
| REL-08 | Segurança do domínio | PENDING | Verificar alerta de segurança em preview anterior e usar domínio produtivo com HTTPS sem alerta |
| REL-09 | Autorização de publicação | PENDING | Aprovação explícita de merge develop -> main, observabilidade e plano de rollback antes de promover |

## Testes que devem rodar como um único lote

1. Gerar SHA candidato, congelar versão e executar workflow GitHub + CI de 7Service no mesmo conjunto de versões.
2. Validar contas: operador interno, VIEWER do cliente, sem sessão, sessão expirada, usuário revogado e identidade de outro cliente.
3. Validar central decision: token válido e inválido, produto desativado, vínculo revogado, empresa não autorizada, indisponibilidade da autoridade central (fail closed).
4. Validar APIs: GETs permitidos, POST/PATCH/PUT/DELETE negados ao VIEWER, nenhuma leitura cruzada, auditoria de concessões e negativas.
5. Validar multempresa, logout, sessão renovada e proteção de dados em duas organizações isoladas.
6. Preparar Vercel production com configurações próprias; testar readiness e smoke do mesmo SHA.
7. Somente então promover com autorização explícita e executar smoke pós-deploy; rollback em caso de falha.

## Princípios obrigatórios

- A autenticação central **não** autoriza inventar JWT do Supabase Commander nem desabilitar RLS.
- Sessão e empresa devem derivar de identidade verificada no servidor, nunca apenas do e-mail nem de headers do cliente.
- Sem uso de service_role no navegador, sem registrar senhas/tokens em logs, sem migrar dados QA para produção.
- `READY` da Vercel é build/deployment, não prova de autorização, SSO ou isolamento real.
