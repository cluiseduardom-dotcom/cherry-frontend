# VERTUMNO — Quality Gate

Uma alteração é tecnicamente pronta somente quando os checks obrigatórios do repositório passam.

## Frontend
- npm ci
- Oxlint
- Vitest
- build

## Regras
1. CI vermelho bloqueia a conclusão da tarefa.
2. Não silenciar testes para obter CI verde.
3. Não remover validações para contornar falhas.
4. Falhas de infraestrutura devem ser distinguidas de falhas do código.
5. Fluxos de frontend devem ser validados com autenticação, autorização, estados de erro e integração com API quando aplicável.

## Objetivo
O CI é um quality gate automatizado, não uma substituição da revisão técnica ou homologação do produto.
