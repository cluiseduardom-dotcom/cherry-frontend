# CHERRY FRONTEND — AUDITORIA TELA A TELA

Base: audit/integration-contracts-2026-09
Data: 2026-09-19

## Objetivo

Verificar as telas do frontend contra contratos reais, regras de negócio, estados de interface e comportamento de uso. Esta etapa não altera código funcional.

---

## 1. Venda

### FE-UX-001 — Prazo de venda com contrato incompatível
A interface pede dias e envia `dias_prazo`, enquanto o backend valida `meses_prazo`.

**Prioridade: P0**

Não corrigir por suposição. É necessária uma decisão explícita de negócio: prazo em dias ou prazo em meses.

### FE-UX-002 — Fluxo de venda a prazo sem indicação do vencimento
Enquanto a regra de prazo não estiver definida, a interface não consegue comunicar de forma confiável quando a conta vencerá.

**Prioridade: P1**

### FE-UX-003 — Sessão perdida ao recarregar
O token fica somente em memória.

**Prioridade: P1**

---

## 2. Estoque

### FE-UX-004 — Badge da Sidebar estático
A Sidebar mostra o número `3` para estoque independentemente dos dados reais.

**Prioridade: P1**

O badge deve representar uma métrica real, por exemplo quantidade de alertas de estoque baixo/esgotados, ou ser removido.

### FE-UX-005 — Resumo e filtro usam regras diferentes de baixo estoque
A tela usa `estoque_minimo` no filtro/status, enquanto o contador de alertas depende da resposta de `listarEstoqueBaixo()`.

**Prioridade: P1**

As duas fontes devem representar exatamente a mesma regra de negócio para evitar números divergentes na mesma tela.

### FE-UX-006 — Tabela precisa de estratégia mobile explícita
A tela principal usa tabela com várias colunas. É necessário validar o comportamento em largura de celular: scroll horizontal, colunas prioritárias e ação de movimentação.

**Prioridade: P1 — UX**

---

## 3. Produtos / Precificação

### FE-UX-007 — Exclusão usa confirmação nativa do navegador
`window.confirm()` funciona, porém quebra a experiência visual do sistema e oferece pouco contexto.

**Prioridade: P2**

Evoluir para modal de confirmação padronizado.

### FE-UX-008 — Cards de produto simulam imagem com iniciais
A área visual do produto usa gradientes e iniciais, apesar do produto final prever uso de fotos.

**Prioridade: P1 — experiência do catálogo**

A estrutura deve aceitar imagem real sem destruir o fallback atual.

### FE-UX-009 — Precificação depende de estado de navegação, com fallback correto
A página de precificação recebe nome/SKU/custo via `location.state` e busca o produto se a página for aberta diretamente.

**Status: consistente.**

### FE-UX-010 — Cadastro de categorias limita a 100 registros
`CategoriasProduto.jsx` chama `listarCategorias({ page: 1, pageSize: 100 })` e não pagina.

**Prioridade: P2**

Para produto comercializado em escala, a tela deve carregar todas as categorias via paginação ou endpoint adequado.

---

## 4. Clientes

### FE-UX-011 — Critério VIP está hardcoded
A marcação VIP depende de `total_gasto >= 1000` diretamente no componente.

**Prioridade: P1**

Transformar em regra configurável ou, no mínimo, centralizada em uma constante/regra de domínio.

### FE-UX-012 — Busca não inclui telefone
A pesquisa considera nome e e-mail, mas não telefone.

**Prioridade: P2**

Para atendimento de loja, telefone pode ser um identificador operacional importante.

---

## 5. Histórico

### FE-UX-013 — Botão “Este mês” não executa filtro
O botão é visual e não altera o período.

**Prioridade: P1**

Implementar período real ou remover o controle.

### FE-UX-014 — Botão “Filtros” não abre filtro
O botão também é visual.

**Prioridade: P1**

Implementar filtros úteis (status, canal, período e eventualmente forma de pagamento) ou remover.

### FE-UX-015 — Métricas atuais são calculadas sobre o conjunto carregado
O resumo usa os dados da lista atual. Caso o endpoint seja paginado, isso pode gerar métricas incompletas.

**Prioridade: P1**

Definir se o resumo vem do backend ou se a tela deve carregar todas as páginas antes de calcular.

---

## 6. Relatórios

### FE-UX-016 — Relatório de vendas gera N+1 chamadas
O relatório primeiro carrega as vendas e depois chama `buscarVenda(id)` individualmente para cada venda a fim de descobrir quantidade de itens.

**Prioridade: P1**

Criar endpoint/consulta agregada ou incluir a informação necessária na listagem.

### FE-UX-017 — Relatório de vendas carrega o conjunto inteiro e filtra no frontend
As vendas são carregadas em todas as páginas e só depois filtradas por período/canal.

**Prioridade: P1**

O backend deve receber os filtros e devolver somente o conjunto necessário.

### FE-UX-018 — Relatório de estoque pode gerar muitas chamadas
Sem produto selecionado, o relatório percorre produtos e consulta movimentações de cada produto.

**Prioridade: P1**

Criar consulta agregada de movimentações por período/produto.

### FE-UX-019 — Relatório financeiro consulta dados auxiliares fora do período
A resolução do nome do cliente carrega vendas e clientes separadamente, sem limitar vendas ao universo efetivamente exibido.

**Prioridade: P2**

Preferir resposta do backend já enriquecida ou endpoint específico para relatório.

### FE-UX-020 — Exportação PDF depende de captura visual
A exportação usa html2canvas + jsPDF.

**Prioridade: P2**

Funciona como solução de apresentação, mas não é ideal como geração de relatório determinística. Em evolução, considerar geração baseada em dados/HTML específico ou backend.

---

## 7. Configurações

### FE-UX-021 — Dados de perfil estão hardcoded
A tela mostra “Maria Silva”, e-mail fixo e cargo fixo.

**Prioridade: P0 comercial**

Isso não pode permanecer quando o sistema for usado por outra empresa/usuário.

### FE-UX-022 — Plano/assinatura estão hardcoded
Plano PRO e data de renovação são estáticos.

**Prioridade: P0 comercial**

Devem vir do tenant/conta/assinatura real ou ser claramente marcados como indisponíveis.

### FE-UX-023 — Vários itens de configuração não têm ação
Perfil, segurança, tema, idioma, notificações, dados da empresa e assinatura aparecem como configurações navegáveis, mas a maioria não possui handler.

**Prioridade: P1**

Cada item precisa ser:
- funcional;
- claramente marcado como futuro;
- ou removido temporariamente.

### FE-UX-024 — Perfil lateral não usa o usuário autenticado
O card lateral da configuração não usa os dados reais de `useAuth()`.

**Prioridade: P1**

Usar o usuário autenticado e dados reais do tenant.

---

## 8. Dashboard

### FE-UX-025 — Dashboard está funcional e orientado a decisão
Já possui Curva ABC, giro, cobertura, estoque esgotado e atalhos.

**Status: positivo.**

### FE-UX-026 — Margem disponível no backend não é explorada
A auditoria de contrato já identificou que o backend fornece margem e o dashboard atual não a utiliza.

**Prioridade: P2**

Avaliar KPI de margem, contribuição e alertas de rentabilidade.

---

## 9. Navegação mobile

### FE-UX-027 — “Mais” aponta para rota inexistente
`BottomNav.jsx` envia para `/mais`, mas a rota não está registrada no `App.jsx`.

**Prioridade: P0 UX mobile**

Toque em “Mais” pode levar ao fallback em vez de abrir uma área útil.

---

## 10. Arquitetura de acesso

### FE-UX-028 — Matriz de rotas está consistente
`access.js` e `App.jsx` possuem validação cruzada em runtime.

**Status: positivo.**

### FE-UX-029 — Categorias são mais restritivas no frontend
Backend aceita admin/estoquista para categorias, enquanto a rota visual aceita apenas admin.

**Prioridade: P2**

Não tratar como bug sem decisão de RBAC. Definir claramente a intenção para Vertunmo/GiroOne.

---

# Ordem de execução recomendada

## P0 — antes de considerar o frontend pronto
1. Corrigir contrato de prazo da venda.
2. Remover dados fictícios de Configurações.
3. Corrigir rota `/mais` no mobile.
4. Garantir que o fluxo de autenticação tenha comportamento definido após reload.

## P1 — profissionalização
1. Badge real de estoque.
2. Regra única de estoque baixo.
3. Histórico com filtros funcionais.
4. Relatórios com filtros no backend e sem N+1.
5. Preparar catálogo para fotos reais.
6. Tornar VIP uma regra de domínio.
7. Revisar tabelas no mobile.

## P2 — evolução
1. Modal de confirmação padronizado.
2. Paginação completa de categorias.
3. Relatórios agregados.
4. PDF baseado em dados.
5. Explorar margem no dashboard.
6. Revisar matriz de RBAC das categorias.

# Regra para a próxima etapa

Não iniciar uma grande refatoração visual antes dos P0 de contrato/estado. A sequência recomendada é:

**P0 funcional → componentes/design system → UX visual com Gemini → implementação/refatoração com Claude → revisão e QA com GPT.**
