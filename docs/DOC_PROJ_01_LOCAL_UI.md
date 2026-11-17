# DOC-PROJ-01 / UX-LOCAL-01 | Ajustes de interface, etapa 1

Branch: `work/local-kairos-operacional-20261111`
Base da branch: `develop`. Não promover para `develop` nem para `main` sem gates.

## Implementado no frontend local

- A função antiga de ingestão de conteúdo saiu de `Projeto` e passou para a aba `Documentos`.
- A aba `Documentos` exibe o botão `Adicionar documento` mesmo no modo local somente leitura. Ele fica **desabilitado**, com explicação de segurança.
- A listagem de conteúdo já ingerido permanece visível independentemente do formulário de upload.
- O comando `Excluir registro` é exibido desabilitado no modo leitura, e o handler recusa a ação.
- O fluxo existente de extração/ingestão é preservado fora do modo leitura, sem alegar que o arquivo original foi armazenado.
- Botões de criar/editar riscos e decisões continuam visíveis (desabilitados em leitura); alteração de status também é desabilitada.
- Os detalhes do projeto e stakeholders seguem visíveis; campos de edição ficam desabilitados em leitura.
- A seleção de projeto no modo local não realiza PATCH em `/api/projects/active`, evitando escrita no Supabase oficial.
- Convites e revogações ficam desabilitados em leitura.

## NÃO implementado nesta etapa

O fluxo atual de `/api/knowledge/ingest` salva conhecimento extraído, e pode enriquecer o cadastro do projeto. Ele não é um repositório do **arquivo original**. Não mostrar "Baixar original" enquanto não houver Storage/metadata e mecanismo autenticado de download.

Para DOC-PROJ-01 completo, preparar em uma etapa separada:
1. Bucket privado do Supabase Storage com políticas de projeto/tenant e tipo/tamanho de arquivo limitados.
2. Metadados imutáveis do anexo (id, organization_id, project_id, storage_key, nome, MIME, tamanho, checksum, usuário, timestamps e status).
3. Endpoints autenticados de upload, listagem, download de acesso curto e exclusão (escopo da organização, autorização independente e auditoria).
4. Análise com Kairos **opcional e separada** do upload; não alterar automaticamente objetivo, contexto, tags ou stakeholders sem aceite explícito.
5. Testes de isolamento multiempresa, caminho transversal, duplicidade, erro, permissão viewer, retenção e cancelamento.
6. Homologação com testes simulados antes de qualquer escrita real. **Não aplicar migrations nem criar bucket no Supabase oficial durante a fase local somente leitura.**

## Gates para revisão

```powershell
git pull --ff-only origin work/local-kairos-operacional-20261111
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run dev -- --hostname localhost --port 3100
```

Validar em Projeto > Documentos (empresa 7CONSULTING): botão Adicionar documento visível e desabilitado, registros já processados consultáveis, exclusão desabilitada. Em Riscos/Decisões: listagem visível, botões existentes visíveis e desabilitados; nunca gerar POST/PATCH/DELETE local. Em Projeto: stakeholders em tabela somente leitura. Trocar projetos e confirmar que não é enviado PATCH para alteração do projeto ativo.

Os testes adicionados nesta etapa validam contratos estáticos do frontend, não substituem teste funcional no browser. Build e lint ainda precisam ser executados no Windows do desenvolvedor.
