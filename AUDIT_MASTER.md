# CHERRY — AUDIT MASTER

> Documento-base para evolução técnica, de produto e UX.
> Branch de trabalho: `audit/foundation-2026-09`
> Base auditada: `f23696f887161bda03eb545e109ad335c20d5024`
> Data: 2026-09-19

## Objetivo

Transformar o Cherry em uma base profissional, consistente e preparada para evolução como produto GiroOne, sem adicionar complexidade antes de consolidar arquitetura, UX, segurança e qualidade.

## Fontes de verdade

1. Código do repositório
2. Regras de negócio documentadas
3. Contratos da API/backend
4. Este documento para prioridades de auditoria
5. Decisões explícitas do responsável pelo produto

## Estado inicial

### Confirmado no frontend

- React 19 + Vite 8
- React Router 7
- JavaScript/JSX — não TypeScript
- CSS próprio/design system — não Tailwind
- JWT/AuthContext
- controle de acesso por rota, campo e ação com fail-closed
- CI com npm ci, lint e build
- testes Vitest
- páginas operacionais e financeiras conectadas

### Pontos já identificados

| ID | Área | Problema | Prioridade | Status |
|---|---|---|---|---|
| AUD-001 | Documentação | MAPA_CHERRY_ERP.md descreve TypeScript/Tailwind, mas o frontend atual usa JSX/CSS | Alta | Aberto |
| AUD-002 | UX | Badge de estoque na Sidebar está fixo em "3" | Média | Aberto |
| AUD-003 | UX | BottomNav possui /mais, mas não existe rota correspondente | Alta | Aberto |
| AUD-004 | Arquitetura | Consolidar componentes visuais compartilhados antes de ampliar módulos | Alta | Aberto |
| AUD-005 | UX | Auditoria visual precisa ser feita com aplicação renderizada, não apenas código | Alta | Aberto |
| AUD-006 | Qualidade | Formalizar fluxo branch → CI → revisão → merge | Alta | Aberto |

## Ordem de execução

### Fase 1 — Fundação
- corrigir documentação;
- estabelecer regras de trabalho das IAs;
- proteger fluxo de branches/PR;
- validar CI.

### Fase 2 — Design System
- mapear componentes duplicados;
- padronizar Button, Card, Input, Select, Modal, Table, Badge, Alert, Toast, EmptyState, Loading, PageHeader e KPI;
- preservar identidade Cherry.

### Fase 3 — UX
Auditar, nesta ordem:
1. Login
2. Dashboard
3. Venda
4. Produtos
5. Estoque
6. Clientes
7. Histórico
8. Contas a pagar
9. Contas a receber
10. Ponto de equilíbrio
11. Despesas fixas
12. Configurações

Para cada tela:
- objetivo principal;
- ação primária;
- hierarquia visual;
- estados loading/empty/error/success;
- feedback;
- quantidade de cliques;
- desktop;
- mobile;
- acessibilidade;
- consistência com o design system.

### Fase 4 — Funcionalidades
Somente após a fundação:
- relatórios;
- produção/fornecedores;
- demais módulos do produto.

## Critérios de aceite

Nenhuma alteração relevante deve ser considerada concluída sem:

- build passando;
- lint passando;
- testes relevantes passando;
- regra de acesso validada;
- estado de erro tratado;
- estado vazio tratado;
- comportamento mobile considerado;
- documentação atualizada quando houver mudança arquitetural;
- sem alteração não solicitada de regra de negócio.

## Papéis das IAs

### GPT
Arquitetura, regras de produto, análise crítica, QA e revisão final.

### Claude
Implementação, refatoração, testes e integração.

### Gemini
UX/UI, usabilidade, hierarquia visual, acessibilidade e revisão da experiência.

### Regra
Nenhuma IA deve alterar regra de negócio ou arquitetura estrutural por iniciativa própria quando a decisão não estiver documentada.

## Próxima ação

Atualizar a documentação do projeto para refletir a stack real e depois atacar AUD-002/AUD-003 em uma branch de correção pequena, com CI e revisão.
