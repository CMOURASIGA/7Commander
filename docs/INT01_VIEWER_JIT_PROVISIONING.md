# INT-01 | Provisionamento automático VIEWER no primeiro login

O 7Service é autoridade para identidade, assinatura e licença. O 7Commander mantém uma conta Auth local sem senha para emitir JWT local compatível com RLS.

## Fluxo
1. Login com e-mail e senha do 7Service; autenticação e e-mail confirmado são validados na origem.
2. Resolver a identidade global do token, a organização explicitamente vinculada e o grant COMMANDER7/VIEWER ACTIVE.
3. Se não houver vínculo local e a flag JIT estiver habilitada, conferir que não existe Auth local com mesmo e-mail; contas legadas requerem revisão manual.
4. Criar Auth local sem senha e executar RPC transacional que associa membro de empresa com role member, perfil local e vínculo de identidade central, com auditoria e aprovador ativo.
5. Emitir sessão local apenas após a política central de leitura permitir a operação.

## Habilitação em QA
- Aplicar migração database/migrations/076_int01_viewer_jit_provision.sql na base de testes. RPC é executável somente por service_role.
- Configurar flags server-side COMMANDER_CENTRAL_AUTH_ENABLED=true, COMMANDER_CENTRAL_BROKER_ENABLED=true, SERVICE_7SERVICE_ENFORCE_USER_ACCESS=true.
- Definir SERVICE_7SERVICE_PILOT_ORG_ID como UUID da organização CONSULT SERVICES previamente vinculada.
- Definir COMMANDER_CENTRAL_PROVISION_ACTOR_ID como UUID de administrador Commander ativo e auditável.
- Definir COMMANDER_CENTRAL_JIT_VIEWER_ENABLED=true.
- Para tenant vinculado: COMMANDER_CENTRAL_BROKER_MULTITENANT_ENABLED=true e SERVICE_7SERVICE_ENFORCE_LINKED_TENANTS=true apenas após homologação.
- Preservar segredos exclusivamente no servidor. Todas as flags ficam OFF até liberação do piloto.

## Critérios de homologação
- Primeiro login: cria exatamente um usuário Auth local sem senha, member ativo, profile e vínculo central ACTIVE.
- Segundo login: nenhuma duplicidade nem alteração de organização.
- GET permitido para leitura; POST/PATCH/DELETE negados quando não cobertos pela função VIEWER.
- Suspensão no 7Service bloqueia novo login e operações protegidas no Commander.
- Usuário já existente com mesmo e-mail sem vínculo exige revisão manual; nunca toma posse por e-mail.
- Falha parcial não permite login; Auth órfão exige conciliação em vez de exclusão automática.

## Limites
Esta versão automatiza o provisionamento no primeiro login, não imediatamente após o clique de concessão. Não significa que produção esteja homologada. A migração não foi aplicada à base de produção.
