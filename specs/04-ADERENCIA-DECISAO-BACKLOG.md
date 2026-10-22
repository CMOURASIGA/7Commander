# SPEC 04 - Matriz de aderencia, decisao e backlog | 7Commander
Status: PROPOSTA. Origem conceitual: ASF especialista_aderencia, agente_validador_matriz, architect e product_owner. Prioridade P2.

## Requisitos
AD-01 Comparar baseline de requisitos a cada alternativa pesquisada e opcao de desenvolvimento interno: atende, parcial, nao atende, desconhecido; justificativa com evidencia e fator de confianca.
AD-02 Pesos/criterios configuraveis, custos em faixa com premissas e fonte, prazo estimado, dependencias, risco de fornecedor, seguranca, privacidade e manutenibilidade. Nunca apresentar orcamento como cotacao contratual.
AD-03 Detectar inconsistencias da matriz e ausencia de evidencias; score apenas para itens verificados e explicitar cobertura e desconhecidos para evitar ranking enganoso.
AD-04 Gerar opcoes: adotar, integrar, desenvolver ou hibrido; parecer e recomendacao como rascunho do Kairos.
AD-05 Gate humano: aprovar/rejeitar/pedir revisao; decisao com responsavel, data, alternativas, riscos, justificativa e snapshot imutavel das evidencias.
AD-06 Com decisao aprovada, criar backlog de epicos/historias/tarefas no projeto existente, com IDs idempotentes e ligacao requisito -> evidencia -> decisao -> item; sem ativar execucao automatica.
AD-07 Exportacao e historico versionado, visualizacao de mudancas de baseline e necessidade de revalidar a decisao.

## Aceite
Uma alternativa com evidencia insuficiente nao recebe pontuacao como se atendesse. Criacao repetida de backlog nao duplica tarefas. Decisao e backlog ficam rastreaveis por projeto e oportunidade.