# CHERRY FRONTEND — INTEGRATION AUDIT

Base: f23696f887161bda03eb545e109ad335c20d5024
Data: 2026-09-19

## Achado crítico confirmado

### FE-AUD-001 — Prazo de venda: contrato divergente

A tela `Venda.jsx` trabalha com `diasPrazo` e envia `dias_prazo`.

O service `src/services/vendas.js` também aceita `dias_prazo`.

O backend, porém, valida e processa `meses_prazo`:
- `src/validations/vendasValidation.js`
- `src/services/vendasService.js`

Como o schema backend é `.strict()`, uma venda a prazo com `dias_prazo` não corresponde ao contrato atual e pode resultar em erro de validação.

**Prioridade: P0 — corrigir antes de considerar o fluxo de venda a prazo concluído.**

### FE-AUD-002 — Sessão não persiste após reload

`AuthContext.jsx` mantém token apenas em estado/ref. Não há restauração de sessão no carregamento da aplicação.

Impacto: um refresh do navegador encerra a sessão local, mesmo que o JWT ainda esteja válido.

**Prioridade: P1 — decisão de segurança/UX.**

### FE-AUD-003 — Backend e frontend precisam de contrato formal

Os services frontend estão bem centralizados, mas os contratos são implícitos. O caso do prazo demonstra que uma alteração de nomenclatura no backend pode quebrar a tela sem uma checagem automática entre os dois repositórios.

**Prioridade: P1 — criar contrato versionado ou testes de contrato.**

## Pontos confirmados como consistentes

- `/vendas` exige papel de vendedor/admin no backend e o frontend restringe a tela de venda aos mesmos papéis.
- `/contas-pagar`, `/contas-receber`, dashboard e ponto de equilíbrio são admin-only nos dois lados.
- `/produtos/:id/precos` é admin-only no frontend e alteração de preço é admin-only no backend.
- Movimentação de estoque é admin/estoquista nos dois lados.
- Categorias e níveis de categoria são admin/estoquista no backend; a rota visual de categorias é admin no frontend, o que é mais restritivo e deve ser tratado como decisão de UX/RBAC, não como bug automático.
- O parâmetro de paginação `pageSize` usado pelo frontend é aceito pelo backend atual; não é um problema.

## Próxima etapa

Auditar tela por tela contra o contrato real:
1. Venda
2. Estoque
3. Produtos/Precificação
4. Clientes
5. Histórico
6. Financeiro
7. Relatórios
8. Configurações

Para cada tela, verificar payload, resposta, loading, erro, estados vazios, permissões e comportamento após mutação.

Nenhum código funcional foi alterado nesta auditoria.
