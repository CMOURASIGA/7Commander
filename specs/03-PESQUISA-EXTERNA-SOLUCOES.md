# SPEC 03 - Pesquisa externa e catalogo de alternativas | 7Commander
Status: PROPOSTA. Origem conceitual: ASF busca_de_solucoes, especialista_mapeamento, agentes de catalogo e providers. Prioridade P2.

## Objetivo
Investigar build/buy/integrar com base nos requisitos e confrontar solucoes comerciais disponiveis, sem tratar conteudo da web como verdade ou instrucao.

## Requisitos
PE-01 Pesquisa iniciada por usuario autorizado sobre baseline de requisitos de SPEC 02; definir objetivo, pais/idioma, categorias, limites de tempo, custo e numero de fontes.
PE-02 Provedor de busca externo desacoplado e ativado por configuracao; nao presumir API gratuita nem copiar componentes ASF sem revisao de licenca/dependencias.
PE-03 Consultas rastreaveis e fontes oficiais prioritarias: URL, titulo, autor/editor quando houver, data de consulta, trecho de evidencia, data da informacao, status de verificacao e versao da busca.
PE-04 Catalogo deduplicado de alternativas: produto, fornecedor, cobertura funcional, limites, integracoes, pricing (valor, moeda, unidade, fonte e data), LGPD/seguranca COM STATUS VERIFICADO/NAO CONFIRMADO, idioma e suporte.
PE-05 Guardrails de navegacao: allowlist/blocklist de dominios, protecao SSRF e redirecionamentos, tamanho maximo, timeout, rate limit, tratamento de prompt injection e respeito a robots/termos.
PE-06 Credenciais server-side, exclusao de PII e dados confidenciais das queries, revisao humana para qualquer transferencia externa sensivel.
PE-07 Falha/indisponibilidade de fonte nao vira recurso ausente; guardar nao verificado e permitir verificacao manual, reexecucao e expiracao de evidencia.
PE-08 Historico, custo por pesquisa, alertas de limite e bloqueio apos quota.

## Aceite
Cada afirmacao comparativa relevante tem fonte e data, ou indicacao NAO VERIFICADO. Pesquisa nao efetua compra, cadastro, contratacao, envio de e-mail nem integracoes sem aprovacao separada. Cenários de URL maliciosa e instrucao inserida em pagina nao alteram o escopo do agente.