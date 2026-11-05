# INT-01 | Reconciliar histórico de main com develop

Execução controlada autorizada somente para **main → develop**, nunca publish ou merge `develop → main`.

Main está seis commits à frente do ancestral comum, mas a implementação atual de `develop` é mais recente. O workflow verifica todos os caminhos modificados exclusivamente na main, exige identidade de conteúdo para os já absorvidos, aceita somente seis arquivos divergentes revisados e retém a árvore atual da develop.

O merge preserva o histórico de main como ancestral sem trocar código novo pelo release antigo. Só faz push na develop após testes, typecheck, lint e build aprovados. Qualquer diferença nova ou gate reprovado interrompe a operação sem alterações remotas.

Observação: a liberação comercial continua dependente de infraestrutura produtiva independente, homologação E2E do login único e aprovação explícita para main.
