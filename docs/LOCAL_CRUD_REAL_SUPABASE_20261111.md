# LOCAL-CRUD-01 | Homologação com escrita REAL no Supabase oficial

**Projeto:** 7Commander | **Branch:** `work/local-kairos-operacional-20261111`

O operador solicitou CRUD real, direto no Supabase oficial `pmituaahaqimvhzhqsry`. Assim, alterações em localhost são imediatamente persistidas na mesma base utilizada pela produção, de acordo com as permissões do usuário e com o RLS.

## Configuração explícita (Windows)

```powershell
cd C:\Projetos\7Commander-local
git pull --ff-only origin work/local-kairos-operacional-20261111
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1 -EnableCrud
npm run env:check
npm run typecheck
npm run test:unit
npm run build
npm run dev -- --hostname localhost --port 3100
```

Variáveis gerenciadas pelo script:

```dotenv
COMMANDER_LOCAL_AUTH_ENABLED=true
NEXT_PUBLIC_COMMANDER_LOCAL_AUTH_ENABLED=true
COMMANDER_LOCAL_READ_ONLY=false
NEXT_PUBLIC_COMMANDER_LOCAL_READ_ONLY=false
SEVEN_COMMANDER_TENANT_SCHEMA_READY=true
SEVEN_COMMANDER_MULTI_TENANT_READY=true
SUPABASE_SERVICE_ROLE_KEY=
```

O `setup-local.ps1` nunca altera sozinho de false para true ao ser reexecutado sem `-EnableCrud`. `env:check` rejeita `service_role` preenchida quando a autenticação local por RLS está habilitada.

## Segurança e comportamento

- `getSupabaseServerClient` usa a chave pública (anon) com JWT validado do usuário no contexto da requisição e políticas RLS.
- Não utiliza service_role para CRUD local.
- Middleware só aceita operador administrador interno ativo, com vínculo empresarial ativo, para acesso a páginas.
- API `requireApiAuth` verifica JWT, administrador de plataforma e membership. Sem JWT/autorizações, negar.
- `ui-capabilities` não depende da tabela interna inacessível ao papel authenticated; autoriza escrita na interface somente para administrador interno com JWT, empresa e flags corretos.
- CRUD continua sujeito à política RLS de cada tabela; operações sem permissão podem retornar 403 e não devem ser contornadas aumentando privilégios.
- Não altera o código da produção, políticas do banco nem deploy. Não sincronizar flags de localhost com a Vercel.
- A ingestão de documentos hoje processa conteúdo e pode atualizar campos do projeto. **Não guarda o arquivo original para download**. Não confundir com armazenamento documental completo.
- É imprescindível limitar operações de homologação a registros identificados e acompanhar os impactos reais, inclusive exclusões e efeitos em Status Report, Kairos e auditoria.

## Validação funcional

1. Reiniciar a aplicação depois da alteração das flags.
2. Confirmar `/api/auth/ui-capabilities` com `readOnly:false` e identidade autorizada.
3. Criar um risco com título inequívoco de homologação. Conferir persistência após recarregar.
4. Editar o risco e confirmar persistência. Excluir somente o registro específico e confirmar exclusão.
5. Testar decisão e documento com consciência de que são registros reais no Supabase.
6. Registrar evidências e limpar apenas registros de teste, sem afetar registros preexistentes.

**Observação:** npm test/build ainda precisam ser executados no Windows do operador. Não presumir que o CRUD funcionará até as verificações funcionais, pois a política RLS pode impedir escrita em módulos específicos.
