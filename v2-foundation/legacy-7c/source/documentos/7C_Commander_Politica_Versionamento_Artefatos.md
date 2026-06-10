# 7C Commander - Política de Versionamento e Artefatos

## Objetivo
Definir como os artefatos devem ser salvos, atualizados, versionados e exibidos.

---

# 1. Princípios

- Todo artefato importante deve ter histórico mínimo.
- O sistema deve evitar perda de conteúdo.
- A versão mais recente deve ficar clara.
- O usuário deve entender quando está sobrescrevendo e quando está gerando nova versão.

---

# 2. Tipos de atualização

## Sobrescrita controlada
Usar quando:
- o documento é de trabalho corrente
- a atualização é pequena
- não há necessidade de manter versão separada

## Nova versão
Usar quando:
- há mudança relevante de conteúdo
- o artefato mudou de estágio
- o usuário deseja preservar versão anterior
- o arquivo é marco importante do projeto

---

# 3. Convenção de versões

## Modelo simples
- v1
- v2
- v3

## Metadados obrigatórios
- versão
- criado por
- atualizado por
- data de criação
- data de atualização
- status do artefato

---

# 4. Status do artefato

## Sugestão
- DRAFT
- ACTIVE
- FINAL
- ARCHIVED

---

# 5. Convenção de nomes

## SAI
- Storyboard_Inicial_YYYY-MM-DD
- Storyboard_Validado_YYYY-MM-DD

## PM
- Diagnostico_Projeto_YYYY-MM-DD
- Plano_Projeto_YYYY-MM-DD
- Backlog_Projeto_YYYY-MM-DD

## BPMN
- AS_IS_Nome_Processo.bpmn
- AS_IS_Nome_Processo.png
- TO_BE_Nome_Processo.bpmn
- TO_BE_Nome_Processo.png

## Status
- Status_Report_YYYY-MM-DD.md
- Dashboard_Executivo_YYYY-MM-DD.html
- Apresentacao_Executiva_YYYY-MM-DD.html

---

# 6. Regras por tipo de artefato

## Google Docs
- podem ser atualizados ou versionados
- a última atualização deve aparecer no sistema

## HTML
- podem ser atualizados com nova versão
- o preview deve sempre apontar para a versão mais recente marcada como atual

## BPMN
- o .bpmn e a imagem correspondente devem estar vinculados
- o sistema deve saber qual é a versão atual
- AS IS e TO BE devem ser claramente separados

---

# 7. Regras de exibição

O sistema deve mostrar:
- nome
- tipo
- versão
- última atualização
- agente
- status
- ação disponível

A versão mais recente deve ser destacada.

---

# 8. Regras de segurança

- não excluir automaticamente versão anterior crítica
- confirmar antes de sobrescrever artefato importante
- evitar perda de histórico em documentos finais

---

# 9. Direcionamento para o dev

O dev deve:
- tratar artefato como entidade com vida própria
- suportar sobrescrita e nova versão
- deixar clara a versão atual
- vincular atualização a usuário e data
- manter relacionamento entre artefatos derivados, quando houver
