# HV-KAIROS-CHAT-01 | Diagnóstico local de notificações e chat

**Data:** 12/11/2026
**Origem:** captura DevTools, localhost:3100, com `my-tasks 200`, `local-session 200` e `scrum/notifications 503`.
**Ambiente de dados:** Supabase `pmituaahaqimvhzhqsry` compartilhado com produção.

## Diagnóstico

- A captura não inclui uma entrada `POST /api/chat`; não é possível concluir que o 503 das notificações tenha causado diretamente a falha da conversa.
- `app/api/scrum/notifications/route.ts` usa `getSupabaseServerClient()`, que no local utiliza o JWT do usuário, sujeito a grants e RLS.
- Antes da correção, `public.scrum_notifications` estava com RLS=true, sem SELECT para `authenticated` e sem policy. Causa compatível com o 503.
- O endpoint `/api/chat` tem fluxo próprio de autenticação, verificação de projeto/tenant, leitura do contexto, chamada do modelo e persistência condicional.

## Correção APLICADA no banco compartilhado

Migration: `commander_scrum_notifications_recipient_read_20261112`; revisão do predicado de projeto em `commander_scrum_notifications_project_tenant_scope_fix_20261112`.

- GRANT SELECT apenas para `authenticated` em `scrum_notifications`.
- Policy `commander_notification_recipient_read_20261112`: empresa ativa do perfil, `is_organization_member`, destinatário igual ao email verificado no JWT, projeto com `organization_id` correspondente à notificação.
- Nenhum INSERT, UPDATE, DELETE concedido. RLS continua habilitado.
- SQL de verificação retornou SELECT=true e write=false. Nenhuma notificação persistida no momento da análise, portanto sem teste de leitura positiva em dados reais.

## Homologação necessária

1. Atualizar `http://localhost:3100/chat` e verificar `/api/scrum/notifications` na Rede: esperado HTTP 200, corpo `{data:[]}` quando não houver notificações.
2. Selecionar empresa e projeto autorizados. Enviar pergunta **somente de análise**, sem pedido de gravação.
3. Filtrar a Rede por `chat`. Inspecionar **POST /api/chat** e coletar status HTTP e o corpo **sanitizado** da resposta. Não compartilhar cookies, Authorization, tokens ou senhas.
4. Se `POST /api/chat` retornar 500, revisar o terminal `npm run dev`, buscando `[/api/chat] error` e causa específica; não inferir relação com notificações.
5. Se retornar 401/403, verificar sessão e tenant no servidor, sem burlar controle. Se 404, validar projeto. Se 429/5xx do provedor, revisar serviço de IA sem expor segredo.
6. Só aprovar KAIROS-SKILLS-02 após receber resposta fundamentada e comparar os cenários de homologação.

**Nenhum deploy ou código do núcleo Kairos alterado neste diagnóstico.**
