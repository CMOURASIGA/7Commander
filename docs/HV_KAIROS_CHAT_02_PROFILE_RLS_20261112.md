# HV-KAIROS-CHAT-02 | HTTP 500 ao processar conversa local

Data: 12/11/2026. Ambiente: localhost:3100, branch `work/local-kairos-operacional-20261111`. Supabase compartilhado com produção `pmituaahaqimvhzhqsry`.

## Sintoma
`POST /api/chat` → HTTP 500 `{"error":"Erro interno ao processar chat."}`. O endpoint captura exceções não previstas e retorna mensagem genérica, portanto a mensagem da API por si só não identifica o passo que falhou.

## Falha estrutural identificada
`services/kairos-core.ts` executa `getKairosProfile(userId)` no `Promise.all` inicial, antes da chamada de IA.
`services/kairos-profile-service.ts` usa `kairos_organization_profiles` quando `TENANT_SCHEMA_READY`, e **lança erro** (`Could not read scoped Kairos profile`) se consulta retornar erro SQL.
No banco, `public.kairos_organization_profiles` tinha RLS=true, `authenticated` sem SELECT e zero políticas. Isso explica uma exceção compatível com o HTTP 500 e pode abortar a resposta mesmo quando não existe perfil customizado.

## Correção aplicada ao Supabase
Migration `commander_kairos_organization_profiles_self_read_20261112`:
- GRANT SELECT apenas à role authenticated.
- Policy SELECT `commander_kairos_profile_self_read_20261112` exige: `user_id = auth.uid()`, empresa ativa do perfil igual a organization_id e vínculo real `is_organization_member(organization_id)`.
- Nenhum GRANT de INSERT/UPDATE/DELETE. RLS permaneceu ativo. Sem escrita de registros.
- Verificação de ACL: SELECT=true, INSERT/UPDATE/DELETE=false, política instalada.
- Consulta JWT simulada em transação BEGIN/ROLLBACK com identidade administradora retornou 0 perfis, **sem erro SQL**. Não havia registro personalizado; comportamento esperado da aplicação é devolver DEFAULT_KAIROS_PROFILE.

## Limitação
A causa é consistente com o código e o estado anterior do banco, mas o stack trace exato do terminal local do usuário ainda não foi observado. Não alegar chat ponta a ponta homologado sem `POST /api/chat 200` + resposta do modelo.

## Reteste
1. Atualizar localhost:3100/chat e enviar comando apenas de consulta, sem criar cards ou riscos.
2. Conferir `POST /api/chat` HTTP 200.
3. Se persistir 500, ler saída sanitizada do terminal `npm run dev` procurando `[/api/chat] error` e a mensagem/stack relevante. Não compartilhar tokens nem .env.
4. Só iniciar homologação KAI-01 após resposta efetiva.
