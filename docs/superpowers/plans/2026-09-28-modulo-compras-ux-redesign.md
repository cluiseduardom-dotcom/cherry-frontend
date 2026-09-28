# Blueprint de UX/UI e Interação: Novo Módulo de Compras (VERTUMNO)

> **Documento de Especialista:** Gemini (UX/UI, Exploração Visual e Interação)  
> **Pipeline:** Gemini (UX/UI + Interação) ➔ GPT (Consolidação Arquitetural) ➔ Claude Code (Implementação)  
> **Referência:** `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/AI_EXECUTION_CONTRACT.md`

---

## 1. Princípios de Experiência e Regra de Ouro da Interface

O redesenho do módulo de **Compras** elimina a sobrecarga burocrática de ERPs tradicionais (OC, PC, NF-e, Recebimento, Liquidação) no primeiro contato do usuário. Toda a jornada é orientada pela **Regra de Ouro**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REGRA DE OURO DA INTERFACE                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Onde estou?         ➔ Identificação clara da visão (Hub / Compra #) │
│ 2. O que está havendo? ➔ Timeline & Progresso visual com status em cor │
│ 3. O que exige atenção?➔ Card de Pendências & Divergências em destaque │
│ 4. Próxima ação?       ➔ Botão contextual único e óbvio                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mapa Geral de Telas e Navegação Consolidada

Para evitar a fragmentação em menus independentes (`/ordens-compra`, `/cotacoes`, `/recebimentos`), todo o fluxo é unificado sob `/compras`:

```
/compras (Hub Operacional)
  ├── Filtros rápidos: [Todas] [Em andamento] [Recebidas] [Pendências] [Histórico]
  ├── Ação primária: [+ Nova compra] ➔ Modal de Intenção (Direta vs Planejada)
  └── /compras/:id (Dashboard Detalhado)
        ├── Sub-abas: [Resumo] [Itens] [Recebimento] [Documentos] [Financeiro] [Histórico]
        └── /compras/:id/recebimento (Modo Foco / Conferência Mobile & Scanner)
```

---

## 3. Especificação Detalhada das Telas

### 3.1 Tela Principal: Hub de Compras (`/compras`)

#### Wireframe Desktop & Visual Hierarchy
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  COMPRAS                                                     [+ Nova compra]     │
│  Entradas de mercadorias, acompanhamento e recebimento                           │
│                                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │ 🔵 Em andamento      │  │ 🟢 Recebidas         │  │ 🟠 Pendências        │    │
│  │    8                 │  │    24                │  │    3                 │    │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘    │
│                                                                                  │
│  ┌──────────────────────────────────────────────┐  ┌────────────────────────┐    │
│  │ 🔎 Buscar compra, fornecedor, NF, SKU...     │  │ [Filtros ▾]  [Exportar]│    │
│  └──────────────────────────────────────────────┘  └────────────────────────┘    │
│                                                                                  │
│  [ Todas (35) ]  [ Em andamento (8) ]  [ Pendências (3) ]  [ Histórico (24) ]    │
│                                                                                  │
│  Compra   Fornecedor       Valor Total   Status        Progresso      Data  Ação │
│  ───────  ───────────────  ───────────  ────────────  ─────────────  ───── ──── │
│  #1042    Fornecedor ABC   R$ 4.850,00  Em conferênc. ●●●●○○  65%    28/09 [->] │
│  #1041    Joias Nobres     R$ 1.290,00  Recebida      ●●●●●● 100%    27/09 [->] │
│  #1040    Gemas Brasil     R$ 8.400,00  Divergência   ●●●●○○  ⚠ Falta28/09 [->] │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Elementos e Comportamento:
1. **Header do Módulo**: Título limpo, subtítulo funcional e botão de ação primária com cor de destaque (`--color-primary`).
2. **Metric Cards (KPI Pills)**:
   - Cards com contadores interativos. Clicar no card filtra a listagem instantaneamente.
   - Feedback hover suave: elevação sutil (`--shadow-card-hover`) e borda acentuada.
3. **Barra de Busca Inteligente**:
   - Debounce de 250ms.
   - Aceita busca por: ID com hashtag (`#1042`), nome ou CNPJ do fornecedor, número da NF-e ou nome do produto/SKU.
4. **Indicador de Progresso na Linha**:
   - Componente visual com 5 a 6 steps discretos e porcentagem associada.
   - Se houver divergência, o marcador de status exibe o ícone de alerta `⚠` em laranja/vermelho (`--color-warning` / `--color-danger`).

---

### 3.2 Modal Seletor de Intenção: "+ Nova compra"

Ao clicar no botão `[+ Nova compra]`, o usuário não é jogado em um formulário monolítico. Ele escolhe a modalidade de compra:

```
┌────────────────────────────────────────────────────────┐
│ Nova compra                                        [✕] │
│ Como você deseja comprar?                              │
│                                                        │
│ ┌───────────────────────────┐ ┌──────────────────────┐ │
│ │ 🛒 Compra direta          │ │ 📋 Compra planejada  │ │
│ │                           │ │                      │ │
│ │ Preciso comprar agora     │ │ Quero planejar uma   │ │
│ │ Para situações imediatas, │ │ necessidade          │ │
│ │ estoque rápido e balcão.  │ │ Necessidade ➔ Cot. ➔ │ │
│ │                           │ │ PC ➔ Recebimento.    │ │
│ │  • Fornecedor             │ │                      │ │
│ │  • Produtos & Preços      │ │ Mantém o ciclo       │ │
│ │  • Condição de Pgto & NF  │ │ completo consolidado │ │
│ │                           │ │                      │ │
│ │ [Iniciar Compra Direta]   │ │ [Iniciar Planejada]  │ │
│ └───────────────────────────┘ └──────────────────────┘ │
│                                                        │
│                    [ Cancelar ]                        │
└────────────────────────────────────────────────────────┘
```

#### Estados e Transições:
- **Card Hover**: Destaque de borda com `--color-primary-light` e fundo `--cherry-50`.
- **Ação Direta**: Abre o Drawer/Modal simplificado de registro imediato (mantendo a compatibilidade do backend atual `POST /compras`).
- **Ação Planejada**: Inicia o fluxo de requisição/planejamento com timeline inicial gerada.

---

### 3.3 Dashboard da Compra (`/compras/:id`)

A visualização detalhada consolida todas as informações em uma única tela hierarquizada:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ← Voltar para Compras                      Compra #1042     [Imprimir] [Ações ▾]│
├──────────────────────────────────────────────────────────────────────────────────┤
│  Fornecedor ABC Ltda                        Valor Total: R$ 4.850,00             │
│  CNPJ: 12.345.678/0001-90                   Data do Pedido: 25/09/2026           │
│                                                                                  │
│  TIMELINE DA COMPRA (65% concluído)                                              │
│  ●───────────●───────────●───────────●───────────◐───────────○                   │
│  Necessidade Cotação     PC          NF-e        Recebimento Financeiro          │
│  ✓ 22/09     ✓ 23/09     ✓ 24/09     ✓ 25/09     ⚠ Em conferência○ A pagar       │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ⚠ PENDÊNCIA REQUER ATENÇÃO                                                      │
│  Foram detectadas 2 unidades faltantes no produto "Brinco Pérola Natural".       │
│  [Registrar divergência]   [Ignorar e aprovar]   [Ver conferência]               │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [ Resumo ]  [ Itens (3) ]  [ Recebimento ]  [ Documentos ]  [ Financeiro ]      │
│                                                                                  │
│  PRODUTOS DA COMPRA                                                              │
│  Item                  SKU        Pedido   Recebido   Unitário   Total           │
│  ────────────────────  ─────────  ───────  ─────────  ─────────  ──────────────  │
│  Colar Corrente Venez. COL-0042   50 un    50 un ✓    R$ 45,00   R$ 2.250,00     │
│  Brinco Pérola Natural BRI-0018   30 un    28 un ⚠    R$ 60,00   R$ 1.800,00     │
│  Pulseira Elo Portug.  PUL-0091   20 un    20 un ✓    R$ 40,00   R$   800,00     │
│                                                                                  │
│                                            Subtotal:             R$ 4.850,00     │
│                                            Total da Compra:      R$ 4.850,00     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 Tela de Recebimento e Conferência Operacional (`/compras/:id/recebimento`)

Focada em **velocidade operacional** e clareza no ato da descarga:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ← Voltar para Compra #1042                                                      │
│  CONFERÊNCIA DE RECEBIMENTO                                                      │
│  NF-e: 123456 • Fornecedor: ABC Ltda                                             │
│                                                                                  │
│  Progresso de conferência: 98 / 100 itens (98%)                                  │
│  ██████████████████████████████████████████████████████████░░                    │
│                                                                                  │
│  Produto                  SKU        Pedido   Recebido   Status                  │
│  ───────────────────────  ─────────  ───────  ─────────  ──────────────────────  │
│  Colar Corrente Venez.    COL-0042   50       50         🟢 Tudo certo ✓         │
│  Brinco Pérola Natural    BRI-0018   30       28         🟠 Divergência (-2 un)  │
│  Pulseira Elo Português   PUL-0091   20       20         🟢 Tudo certo ✓         │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ 🟠 ATENÇÃO: DIVERGÊNCIA IDENTIFICADA                                       │  │
│  │ 2 unidades do produto "Brinco Pérola Natural" não foram recebidas.         │  │
│  │                                                                            │  │
│  │ [Registrar divergência formal]     [Continuar conferência]                 │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  [📷 Abrir Leitor / Scanner]               [Concluir Conferência]                │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.5 Scanner e Leitor de Código de Barras (Mobile First)

O modo de scanner para smartphone ou coletor de dados foi desenhado para operação com uma única mão:

```
┌─────────────────────────────────┐
│ [✕] Leitor de Código      [💡]  │
├─────────────────────────────────┤
│                                 │
│       ┌─────────────────┐       │
│       │ ┌             ┐ │       │
│       │                 │       │
│       │    ▒▒▒▒▒▒▒▒▒    │       │
│       │    ▒▒▒▒▒▒▒▒▒    │       │
│       │                 │       │
│       │ └             ┘ │       │
│       └─────────────────┘       │
│      Aponte para o código       │
│   ou digite o código/SKU        │
│                                 │
├─────────────────────────────────┤
│ ✓ PRODUTO IDENTIFICADO          │
│ Colar Corrente Veneziana        │
│ SKU: COL-0042                   │
│                                 │
│ Pedido: 50 un                   │
│ Recebido até agora: 47 un       │
│                                 │
│      ┌───┐       ┌───┐          │
│      │ − │  48   │ + │          │
│      └───┘       └───┘          │
│                                 │
│   [ +1 Leitura Contínua ]       │
│                                 │
│  ┌───────────────────────────┐  │
│  │    Confirmar Quantidade   │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

#### Requisitos de Interação do Scanner:
- Suporte a leitor óptico USB/Bluetooth (evento `keydown` em buffer rápido) e câmera web/mobile via HTML5 Video / BarcodeDetector API quando disponível.
- Feedback de bip sonoro sutil (opcional/desativável) e vibração hápica (`navigator.vibrate(50)`).
- Botões `+` e `-` com alvos de toque generosos (mínimo de 48x48px).

---

### 3.6 Financeiro com Revelação Progressiva (Progressive Disclosure)

A interface se adapta ao perfil do usuário conectado:

#### Visão Operador / Estoquista:
```
┌──────────────────────────────────────────────┐
│ FINANCEIRO                                   │
│                                              │
│ R$ 4.850,00                                  │
│ Vencimento: 15/10/2026                       │
│                                              │
│ Status: 🟠 A pagar                           │
│ Condição: 1x Boleto a prazo (30 dias)        │
│                                              │
│ [Ver detalhes da fatura]                     │
└──────────────────────────────────────────────┘
```

#### Visão Gerente / Administrador:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FINANCEIRO & INTEGRAÇÃO BANCÁRIA                                            │
│                                                                             │
│ Valor Bruto: R$ 4.850,00     Descontos: R$ 0,00     Líquido: R$ 4.850,00    │
│                                                                             │
│ Parcelas / Títulos Gerados:                                                 │
│ • Parcela 1/1: R$ 4.850,00 • Vencimento: 15/10/2026 • Status: Em aberto     │
│                                                                             │
│ Fluxo Contábil:                                                             │
│ Conta a Pagar (#412) ➔ Pagamento ➔ Liquidação ➔ Extrato Banco ➔ Conciliação │
│                                                                             │
│ [Acessar Contas a Pagar]   [Registrar Baixa / Pagamento]   [Auditoria Fiscal]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Matriz de Perfis e Permissões (RBAC)

Em conformidade com `src/config/access.js` e as diretrizes do VERTUMNO:

| Funcionalidade / Visão | Operador / Estoquista | Supervisor | Gerente / Admin | Ação em `access.js` |
| :--- | :---: | :---: | :---: | :--- |
| **Listar Compras e Status** | ✓ | ✓ | ✓ | Leitura permitida |
| **Conferência Física / Scanner** | ✓ | ✓ | ✓ | `ACTIONS.MOVIMENTAR_ESTOQUE` |
| **Apontar Divergência** | ✓ | ✓ | ✓ | `ACTIONS.MOVIMENTAR_ESTOQUE` |
| **Resolver / Aceitar Divergência** | ✕ | ✓ | ✓ | `ACTIONS.APROVAR_COMPRA` (nova) |
| **Criar Nova Compra (Direta)** | ✕ | ✓ | ✓ | `ACTIONS.GERENCIAR_ESTOQUE` |
| **Criar Nova Compra (Planejada)** | ✕ | ✓ | ✓ | `ACTIONS.GERENCIAR_ESTOQUE` |
| **Aprovar Cotação / PC** | ✕ | ✓ | ✓ | `ACTIONS.APROVAR_COMPRA` (nova) |
| **Acessar Contas a Pagar / Baixa**| ✕ | ✕ | ✓ | Acesso rota `/contas-pagar` |
| **Cancelar Compra / Estorno** | ✕ | ✕ | ✓ | `ACTIONS.GERENCIAR_ESTOQUE` |

---

## 5. Design Tokens e Padrões Visuais Aplicados

Utiliza rigorosamente as variáveis de `src/index.css`:

```css
/* Paleta de Status da Timeline & Divergências */
--color-timeline-done:    var(--color-success);        /* #2E9F57 */
--color-timeline-active:  var(--color-info);           /* #3B82F6 */
--color-timeline-waiting: var(--color-text-muted);     /* #8A8A8A */
--color-timeline-alert:   var(--color-warning);        /* #F3A32D */
--color-timeline-error:   var(--color-danger);         /* #D64545 */

/* Cards e Superfícies */
--compra-card-bg:         var(--color-bg-card);        /* #FFFFFF */
--compra-surface-accent:  var(--cherry-50);            /* #FCF2F4 */
--compra-border-subtle:   var(--color-border-light);   /* #F0E5E8 */
--compra-radius:          var(--radius-lg);            /* 14px */
```

### Micro-interações e Animações:
- **Transição de Etapas da Timeline**: 200ms `ease-in-out` na expansão de nós.
- **Progresso de Conferência**: Barra com animação fluida de preenchimento (`transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1)`).
- **Scanner Pulse**: Indicador de mira com animação sutil de pulso visual (`@keyframes scan-pulse`).
- **Respeito a Acessibilidade**: `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }`.

---

## 6. Layout Responsivo e Adaptação Mobile

### Breakpoint `<= 768px`:
1. **Tabela do Hub vira Cards Táteis**:
```
┌──────────────────────────────────────────────┐
│ Compra #1042                    [Em conf. 🔵]│
│ Fornecedor ABC Ltda                          │
│                                              │
│ R$ 4.850,00                    28/09/2026    │
│ ████████████████░░░░░░░░  65%                │
│                                              │
│ ⚠ 2 itens divergentes aguardando atenção     │
│                                              │
│ [Abrir Compra]          [Conferir Recebimento]│
└──────────────────────────────────────────────┘
```
2. **Bottom-Sheet para Filtros**: Filtros avançados abrem deslizantes a partir do rodapé da tela.
3. **Leitor de Código Ocupa 100% da Largura**: Maximização da visualização de câmera e botões de toque com tamanho mínimo de `48px`.

---

## 7. Componentes Frontend Recomendados para Construção

A ser delegado para o **Claude Code** após a consolidação arquitetural:

1. `src/components/compras/ComprasKpis.jsx`: Cards de resumo (Em andamento, Recebidas, Pendências).
2. `src/components/compras/ComprasTimeline.jsx`: Timeline vertical e horizontal multi-estado.
3. `src/components/compras/CompraIntencaoModal.jsx`: Modal seletor de modalidade (Direta vs Planejada).
4. `src/components/compras/RecebimentoConferencia.jsx`: Checklist de recebimento (Pedido vs Recebido).
5. `src/components/compras/BarcodeScannerModal.jsx`: Interface de escaneamento e contagem tátil.
6. `src/components/compras/CompraFinanceiroCard.jsx`: Card financeiro com progressive disclosure por perfil.
7. `src/pages/CompraDetalhe.jsx`: Dashboard consolidado da compra (`/compras/:id`).
8. Atualização de `src/pages/Compras.jsx`: Transformação na nova experiência de Hub.

---

## 8. Envelope de Tarefa para Handoff (AI_EXECUTION_CONTRACT)

```text
TASK ID: VERTUMNO-COMPRAS-UX-REVAMP
TITLE: Nova Experiência do Módulo de Compras (Hub, Timeline, Recebimento e Scanner)

OBJECTIVE:
Transformar o módulo de compras de um formulário burocrático em um hub operacional moderno,
intuitivo e veloz, incorporando timeline de progresso visual, conferência com scanner tátil,
cards de pendências imediatas e visão adaptada por perfil de usuário.

CONTEXT:
O módulo atual possui apenas uma tabela plana e um modal com formulário direto. O VERTUMNO
necessita de um fluxo que atenda tanto compras rápidas diretas quanto compras planejadas,
com foco no operador de estoque (conferência ágil) e no gestor (visão consolidada).

SCREENS/MODULES:
- src/pages/Compras.jsx (Hub de compras redesenhado)
- src/pages/CompraDetalhe.jsx (Novo dashboard de detalhes /compras/:id)
- src/components/compras/* (Novos componentes de UX: Timeline, Scanner, Cards, Modal de Intenção)
- src/config/access.js (Ajuste de permissões para ações de conferência e aprovação)

USER FLOW:
1. Usuário acessa /compras e visualiza os 3 cards mestres e a listagem com barra de progresso.
2. Ao clicar em [+ Nova compra], escolhe entre Compra Direta (imediata) ou Planejada.
3. Ao abrir uma compra (#1042), visualiza a Timeline de 6 etapas e cards de pendências.
4. No ato da entrega, clica em [Conferência de Recebimento] e bipar itens via câmera ou leitor.
5. Sistema aponta divergência em tempo real e oferece ação direta de resolução.
6. Financeiro exibe dados essenciais para operador e desdobramento completo para admin.

SCOPE IN:
- Hub de Compras com KPIs interativos e busca multicritério.
- Modal de escolha de fluxo de compra (+ Nova compra).
- Timeline interativa multi-estado (concluída, atual, aguardando, alerta).
- Tela/Modal de conferência de recebimento com comparação Pedido vs Recebido.
- Componente de Scanner de código com ajuste numérico rápido (+ / -).
- Layout responsivo desktop (tabela moderna) e mobile (cards táteis).
- Progressive disclosure financeiro baseado em user.role.

SCOPE OUT:
- Alteração nas tabelas do banco de dados (o frontend consome/adapta os dados existentes).
- Criação de novos menus na sidebar (mantém apenas /compras como raiz).

API/DATA:
- GET /compras (com paginação e filtros)
- GET /compras/:id (detalhes da compra e itens)
- POST /compras (criação direta e planejada)
- PATCH /compras/:id/cancelar (cancelamento)
- Endpoints de recebimento e itens a serem mapeados em services/compras.js

PERMISSIONS:
- estoquista / operador: acesso à conferência, apontamento de divergências.
- admin / gerente: criação de compras, aprovações, cancelamento e visão financeira completa.

UX/UI:
- Respeito aos tokens de src/index.css (--color-primary, --color-success, --radius-lg).
- Tipografia Inter, loading skeleton, feedback tátil no mobile, empty states funcionais.
- 4 perguntas da Regra de Ouro atendidas em todas as telas.

RESPONSIVE:
- Desktop: Grid e tabelas fluidas.
- Mobile: Cards táteis, bottom-sheets para filtros, scanner adaptado para operação com uma mão.

ACCEPTANCE CRITERIA:
- Usuário consegue identificar o status e progresso de qualquer compra em menos de 3 segundos.
- Recebimento exibe claramente se há divergência (verde vs laranja).
- Scanner permite incrementar/decrementar quantidades com toque único.
- Ações críticas de gestão respeitam o papel retornado pelo AuthContext.
- Testes unitários com Vitest cobrindo os helpers de negócio e validação.

TESTS:
- Testes de lógica pura com Vitest (cálculo de progresso, detecção de divergência, montagem de payload).
- Testes de consistência de rotas e permissões em access.test.js.

PRIMARY EXECUTOR:
- Claude Code (conforme AI_WORKFLOW.md)

SECONDARY REVIEWER:
- Codex / GPT (Validação arquitetural e testes de regressão)

RISKS:
- Complexidade da API de câmera em navegadores mobile específicos (prever fallback de input manual).
- Manter estrita retrocompatibilidade com compras já salvas no banco.
```
