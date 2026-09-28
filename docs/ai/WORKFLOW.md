# AI WORKFLOW — VERTUMNO

O frontend segue o workflow central definido em `docs/ai/WORKFLOW.md` no backend.

## Papéis

- GPT-5.6 Luna: arquitetura, especificação, consolidação de UX e auditoria.
- Gemini: exploração de UX/UI, fluxos, estados e alternativas de experiência.
- Claude Code: implementação, testes, lint, build e PR.
- GitHub Actions: validação automática.
- Product Owner: decisão, teste e merge.

## Regra de implementação

Nenhuma alteração de frontend deve começar sem:
1. investigar o código existente;
2. confirmar o contrato real da API;
3. definir o fluxo da tela;
4. envolver Gemini quando houver impacto relevante de UX;
5. receber a especificação consolidada;
6. implementar em branch própria.

Sugestões de UX do Gemini são insumo para a especificação; não substituem regras de negócio ou arquitetura.

## Princípios

- Complexidade no motor, simplicidade na operação.
- Reutilizar componentes e padrões existentes.
- Não duplicar serviços ou chamadas de API.
- Não criar lógica crítica somente no frontend.
- Preservar autenticação, RBAC e contratos do backend.
- Não alterar comportamento fora do escopo.

## Entrega

Antes da PR:
- `npm test`
- `npm run lint`
- `npm run build`
- revisão do diff.

A PR deve registrar telas/componentes alterados, APIs utilizadas, comportamento, testes e pontos pendentes.

Nunca fazer merge da própria PR nem trabalhar diretamente na `master`.
