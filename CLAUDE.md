# VERTUMNO — Frontend

Este arquivo define as regras para o Claude Code atuar como executor técnico no frontend.

## Papel no projeto

- Claude Code = executor: investiga, implementa, testa e abre PR.
- GPT = arquiteto/revisor: define especificação, arquitetura, critérios de aceite e audita PR.
- Usuário = Product Owner: valida comportamento e decide o merge.

## Stack atual

- React 19
- Vite 8
- React Router 7
- Vitest
- Oxlint
- jsPDF + html2canvas
- Recharts
- Backend separado em `cherry-backend`

## Regras obrigatórias

1. Nunca trabalhar diretamente na `master`.
2. Criar uma branch por tarefa.
3. Antes de implementar, investigar componentes, páginas, serviços, rotas e contratos de API existentes.
4. Não duplicar componentes, serviços ou chamadas de API que já existam.
5. Preservar os contratos do backend e os fluxos já funcionando.
6. Respeitar autenticação, RBAC e isolamento por empresa definidos pelo backend.
7. Não criar lógica de negócio crítica somente no frontend quando ela deve ser garantida pelo backend.
8. Não alterar visual ou fluxo fora do escopo da tarefa.
9. Reutilizar componentes e padrões existentes antes de criar novos.
10. Não introduzir dependência nova sem necessidade explícita.
11. Não expor secrets ou credenciais no código.
12. Não fazer merge da própria PR.

## UX

- Complexidade no motor, simplicidade na operação.
- A interface deve orientar pela intenção do usuário, não pela estrutura interna do banco.
- Evitar exigir que o usuário conheça entidades técnicas como OC, PC ou liquidação quando o fluxo puder ser apresentado como uma operação simples.
- Estados, erros e confirmações devem ser claros.
- Preservar navegação entre módulos e contexto da operação.

## Integração com backend

- Conferir o contrato real da API antes de criar ou alterar um consumo.
- Enviar somente campos necessários e suportados pelo endpoint.
- Tratar respostas de erro do backend sem mascarar a causa.
- Não duplicar validações de segurança do backend como se fossem a única proteção.
- Quando uma tela depende de nova API, documentar claramente o endpoint esperado no PR.

## Testes e entrega

Antes de abrir a PR:

- executar `npm test`;
- executar `npm run lint`;
- executar `npm run build`;
- revisar o diff;
- verificar que não houve alteração fora do escopo.

A PR deve informar:

1. objetivo;
2. telas/componentes alterados;
3. serviços/API alterados;
4. comportamento implementado;
5. testes, lint e build executados;
6. riscos ou pontos pendentes.

## Segurança operacional

- Nunca commitar `.env`, tokens, senhas ou chaves.
- Nunca colocar credenciais reais em código, fixtures ou logs.
- Não fazer deploy manual sem autorização explícita.
- Não usar `push --force` em branch compartilhada sem autorização.

## Fluxo de IA

```
Product Owner
     ↓
GPT — especificação / arquitetura
     ↓
Claude Code — implementação
     ↓
GitHub Actions — CI
     ↓
GPT — revisão técnica
     ↓
Product Owner — aprovação
     ↓
Merge
```
