# Modo de Montagem de Kit na Venda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um modo de montagem de kit na tela `Venda.jsx` (PDV), onde o vendedor monta um kit a partir de produtos já existentes, confirma, e ele entra no carrinho como uma linha agrupada — e fazer `finalizeSale` enviar `kit_id` sequencial por kit no payload de `/vendas`, corrigindo também o bug de baixa de estoque local que só considerava a primeira ocorrência de cada produto.

**Architecture:** Toda a lógica de kit vive em `src/pages/Venda.jsx`. Funções puras (sem React) ficam como *named exports* no topo do arquivo — testáveis isoladamente via Vitest, no mesmo padrão de `src/config/access.test.js` (ambiente `node`, sem `@testing-library/react`). O carrinho (`cart`) passa a ser uma lista de linhas com discriminante `type`: `'avulso'` (igual a hoje, com a tag `type` adicionada) ou `'kit'` (`{ type: 'kit', kitKey, components: [...], expanded }`). Um novo par de estados (`kitMode`, `kitDraft`) controla a montagem; enquanto `kitMode` é `true`, cliques na vitrine alimentam `kitDraft` em vez do carrinho, e o painel do carrinho é substituído pelo painel de montagem do kit.

**Tech Stack:** React 19 (hooks, sem novas libs), Vitest (ambiente `node`, sem testing-library), CSS puro (`Venda.css`, variáveis já existentes em `index.css`).

**Spec:** fornecida no pedido do usuário nesta conversa (módulo PDV/Vendas — modo de montagem de kit). Decisão de ambiguidade já resolvida com o usuário: o botão "Confirmar kit" exige **2+ componentes distintos** (não "quantidade total >= 2 com produto repetido"), porque o backend (`cherry-backend/src/validations/vendasValidation.js:35-42`) conta **linhas** por `kit_id`, não soma de quantidade — um kit de um único produto nunca teria 2 linhas no payload.

## Global Constraints

- Não introduzir nenhuma biblioteca nova (confirmado: Vitest já transforma JSX em `.jsx` via esbuild padrão do Vite, mesmo sem `@vitejs/plugin-react` carregado no `vitest.config.js` — testado empiricamente nesta sessão).
- Só tocar em `src/pages/Venda.jsx`, `src/pages/Venda.css`, e o novo arquivo de teste `src/pages/Venda.kit.test.js`. Nenhum outro arquivo do projeto (incluindo `vitest.config.js`, `ProductCard.jsx`, `services/vendas.js`) é modificado.
- Nenhuma mudança de RBAC/acesso. Nenhum campo de custo/margem aparece em nenhum momento do fluxo de kit.
- Texto de UI em português.
- **Um único commit** ao final de todo o plano, com a mensagem exata:
  ```
  feat(vendas): adiciona modo de montagem de kit na tela de venda
  ```
  Não commitar a cada task — os passos "commit" do template padrão da skill writing-plans são substituídos por um commit único na última task. Sem `git push`.
- Fora do modo kit, vitrine e carrinho devem se comportar EXATAMENTE como hoje (nenhuma regressão visual/funcional para quem não usa kit).
- Desconto está fora de escopo (sessão futura). Cadastro/reaproveitamento de kit está fora de escopo (kit é sempre montado do zero).

---

### Task 1: Helpers puros de rascunho de kit (`kitDraft`)

**Files:**
- Modify: `src/pages/Venda.jsx` (adicionar exports nomeados após `toCartProduct`, antes do `export default function Venda()`)
- Test: `src/pages/Venda.kit.test.js` (criar)

**Interfaces:**
- Produces: `canConfirmKit(kitDraft) -> boolean`, `addToKitDraft(kitDraft, product) -> newKitDraft`, `changeKitDraftQty(kitDraft, id, delta) -> newKitDraft`, `removeFromKitDraft(kitDraft, id) -> newKitDraft`. `kitDraft` é um array de objetos `{ id, sku, name, category, price, stock, color, qty }` (mesmo shape de um item de carrinho avulso, sem o campo `type`). `product` é o objeto de produto vindo da vitrine (`{ id, sku, name, category, price, stock, color }`, sem `qty`).

- [ ] **Step 1: Escrever os testes (vão falhar — funções ainda não existem)**

Criar `src/pages/Venda.kit.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  canConfirmKit,
  addToKitDraft,
  changeKitDraftQty,
  removeFromKitDraft,
} from './Venda.jsx';

const produtoA = { id: 1, sku: 'A', name: 'Produto A', category: 'Cat', price: 10, stock: 5, color: '#fff' };
const produtoB = { id: 2, sku: 'B', name: 'Produto B', category: 'Cat', price: 20, stock: 2, color: '#000' };

describe('canConfirmKit', () => {
  it('desabilita com rascunho vazio', () => {
    expect(canConfirmKit([])).toBe(false);
  });

  it('desabilita com 1 componente distinto, mesmo com quantidade alta', () => {
    expect(canConfirmKit([{ ...produtoA, qty: 5 }])).toBe(false);
  });

  it('habilita com 2 componentes distintos', () => {
    expect(canConfirmKit([{ ...produtoA, qty: 1 }, { ...produtoB, qty: 1 }])).toBe(true);
  });
});

describe('addToKitDraft', () => {
  it('adiciona produto novo com qty 1', () => {
    const result = addToKitDraft([], produtoA);
    expect(result).toEqual([{ ...produtoA, qty: 1 }]);
  });

  it('incrementa qty de produto já no rascunho', () => {
    const draft = [{ ...produtoA, qty: 1 }];
    const result = addToKitDraft(draft, produtoA);
    expect(result).toEqual([{ ...produtoA, qty: 2 }]);
  });

  it('respeita o limite de estoque do componente', () => {
    const draft = [{ ...produtoB, qty: 2 }]; // produtoB.stock === 2
    const result = addToKitDraft(draft, produtoB);
    expect(result).toEqual([{ ...produtoB, qty: 2 }]); // não passa de 2
  });
});

describe('changeKitDraftQty', () => {
  it('incrementa respeitando o limite de estoque', () => {
    const draft = [{ ...produtoB, qty: 1 }]; // stock 2
    expect(changeKitDraftQty(draft, produtoB.id, 1)).toEqual([{ ...produtoB, qty: 2 }]);
    expect(changeKitDraftQty(changeKitDraftQty(draft, produtoB.id, 1), produtoB.id, 1))
      .toEqual([{ ...produtoB, qty: 2 }]); // não passa do estoque
  });

  it('decrementa sem passar de 1', () => {
    const draft = [{ ...produtoA, qty: 1 }];
    expect(changeKitDraftQty(draft, produtoA.id, -1)).toEqual([{ ...produtoA, qty: 1 }]);
  });
});

describe('removeFromKitDraft', () => {
  it('remove o componente pelo id', () => {
    const draft = [{ ...produtoA, qty: 1 }, { ...produtoB, qty: 1 }];
    expect(removeFromKitDraft(draft, produtoA.id)).toEqual([{ ...produtoB, qty: 1 }]);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/pages/Venda.kit.test.js`
Expected: FAIL — `canConfirmKit`, `addToKitDraft`, `changeKitDraftQty`, `removeFromKitDraft` não são exportados por `Venda.jsx`.

- [ ] **Step 3: Implementar as funções em `Venda.jsx`**

Inserir logo após a função `toCartProduct` (antes de `export default function Venda()`):

```jsx
/* --- Kit draft (montagem de kit) — lógica pura, testável isoladamente --- */

// "Confirmar kit" exige 2+ componentes DISTINTOS: o backend conta linhas por
// kit_id (não soma de quantidade) e exige 2+ linhas; como cada componente
// distinto gera sua própria linha no payload (ver buildVendaItens), um kit
// de um único produto nunca teria 2 linhas, mesmo com quantidade alta.
export function canConfirmKit(kitDraft) {
  return kitDraft.length >= 2;
}

export function addToKitDraft(kitDraft, product) {
  const existing = kitDraft.find(i => i.id === product.id);
  if (existing) {
    if (existing.qty >= product.stock) return kitDraft;
    return kitDraft.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
  }
  return [...kitDraft, { ...product, qty: 1 }];
}

export function changeKitDraftQty(kitDraft, id, delta) {
  return kitDraft.map(i => i.id === id ? { ...i, qty: Math.min(i.stock, Math.max(1, i.qty + delta)) } : i);
}

export function removeFromKitDraft(kitDraft, id) {
  return kitDraft.filter(i => i.id !== id);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/pages/Venda.kit.test.js`
Expected: PASS (todos os testes do Step 1)

---

### Task 2: `buildVendaItens` — payload de `/vendas` com `kit_id` sequencial

**Files:**
- Modify: `src/pages/Venda.jsx` (adicionar export após os helpers do Task 1)
- Test: `src/pages/Venda.kit.test.js` (adicionar `describe`)

**Interfaces:**
- Consumes: nenhuma função de tasks anteriores.
- Produces: `buildVendaItens(cart) -> itens[]`, onde `itens` segue o contrato da API: `{ produto_id, quantidade }` para linha avulsa (sem a chave `kit_id`), `{ produto_id, quantidade, kit_id }` para componente de kit. `cart` é um array de linhas `{ type: 'avulso', id, qty, ... }` ou `{ type: 'kit', kitKey, components: [{ id, qty, ... }], expanded }`. Usado por `finalizeSale` no Task 4.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Adicionar ao final de `src/pages/Venda.kit.test.js` (ajustar o import do Step 1 da Task 1 para incluir `buildVendaItens`):

```js
import {
  canConfirmKit,
  addToKitDraft,
  changeKitDraftQty,
  removeFromKitDraft,
  buildVendaItens,
} from './Venda.jsx';
```

```js
describe('buildVendaItens', () => {
  it('item avulso vira { produto_id, quantidade }, sem kit_id', () => {
    const cart = [{ type: 'avulso', id: 10, qty: 3, sku: 'X', name: 'X', price: 1, stock: 9, color: '#fff' }];
    const itens = buildVendaItens(cart);
    expect(itens).toEqual([{ produto_id: 10, quantidade: 3 }]);
    expect('kit_id' in itens[0]).toBe(false);
  });

  it('kit com 2 componentes vira 2 linhas com o mesmo kit_id = 1', () => {
    const cart = [{
      type: 'kit',
      kitKey: 'kit-1',
      expanded: false,
      components: [
        { id: 1, qty: 2, sku: 'A', name: 'A', price: 1, stock: 9, color: '#fff' },
        { id: 2, qty: 1, sku: 'B', name: 'B', price: 1, stock: 9, color: '#000' },
      ],
    }];
    expect(buildVendaItens(cart)).toEqual([
      { produto_id: 1, quantidade: 2, kit_id: 1 },
      { produto_id: 2, quantidade: 1, kit_id: 1 },
    ]);
  });

  it('dois kits + um avulso recebem kit_id sequencial na ordem do carrinho', () => {
    const kit1 = { type: 'kit', kitKey: 'k1', expanded: false, components: [
      { id: 1, qty: 1, sku: 'A', name: 'A', price: 1, stock: 9, color: '#fff' },
      { id: 2, qty: 1, sku: 'B', name: 'B', price: 1, stock: 9, color: '#000' },
    ] };
    const avulso = { type: 'avulso', id: 3, qty: 5, sku: 'C', name: 'C', price: 1, stock: 9, color: '#aaa' };
    const kit2 = { type: 'kit', kitKey: 'k2', expanded: false, components: [
      { id: 4, qty: 1, sku: 'D', name: 'D', price: 1, stock: 9, color: '#bbb' },
      { id: 5, qty: 2, sku: 'E', name: 'E', price: 1, stock: 9, color: '#ccc' },
    ] };

    expect(buildVendaItens([kit1, avulso, kit2])).toEqual([
      { produto_id: 1, quantidade: 1, kit_id: 1 },
      { produto_id: 2, quantidade: 1, kit_id: 1 },
      { produto_id: 3, quantidade: 5 },
      { produto_id: 4, quantidade: 1, kit_id: 2 },
      { produto_id: 5, quantidade: 2, kit_id: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/pages/Venda.kit.test.js`
Expected: FAIL — `buildVendaItens` não é exportado.

- [ ] **Step 3: Implementar em `Venda.jsx`**

Inserir após `removeFromKitDraft`:

```jsx
/* --- Payload da venda: agrupa linhas do carrinho em itens da API --- */
export function buildVendaItens(cart) {
  const itens = [];
  let nextKitId = 1;

  for (const row of cart) {
    if (row.type === 'kit') {
      const kitId = nextKitId++;
      for (const component of row.components) {
        itens.push({ produto_id: component.id, quantidade: component.qty, kit_id: kitId });
      }
    } else {
      itens.push({ produto_id: row.id, quantidade: row.qty });
    }
  }

  return itens;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/pages/Venda.kit.test.js`
Expected: PASS (todos os testes de `buildVendaItens`, e os das tasks anteriores continuam passando)

---

### Task 3: `reduceEstoqueAposVenda` — corrige o bug da baixa de estoque local

**Files:**
- Modify: `src/pages/Venda.jsx` (adicionar export após `buildVendaItens`)
- Test: `src/pages/Venda.kit.test.js` (adicionar `describe`)

**Interfaces:**
- Consumes: nenhuma função de tasks anteriores.
- Produces: `reduceEstoqueAposVenda(produtos, itensVenda) -> newProdutos`. `produtos` é o array de estado da vitrine (`{ id, sku, name, category, price, stock, color }`). `itensVenda` é `venda.itens` retornado pela API após `criarVenda` (`{ produto_id, quantidade, ... }[]`, pode ter múltiplas entradas com o mesmo `produto_id`). Usado por `finalizeSale` no Task 4, substituindo o `venda.itens.find(...)` atual (bug: só pega a primeira ocorrência).

- [ ] **Step 1: Escrever os testes (vão falhar)**

Adicionar ao import de `Venda.jsx` em `Venda.kit.test.js`: `reduceEstoqueAposVenda`.

```js
describe('reduceEstoqueAposVenda', () => {
  const produtos = [
    { id: 1, sku: 'A', name: 'A', category: 'Cat', price: 10, stock: 10, color: '#fff' },
    { id: 2, sku: 'B', name: 'B', category: 'Cat', price: 10, stock: 5, color: '#000' },
  ];

  it('desconta produto que só aparece em uma linha', () => {
    const result = reduceEstoqueAposVenda(produtos, [{ produto_id: 1, quantidade: 3 }]);
    expect(result.find(p => p.id === 1).stock).toBe(7);
    expect(result.find(p => p.id === 2).stock).toBe(5); // não tocado
  });

  it('soma TODAS as ocorrências do mesmo produto (avulso + dentro de kit)', () => {
    const itensVenda = [
      { produto_id: 1, quantidade: 1 },              // avulso
      { produto_id: 1, quantidade: 2, kit_id: 1 },   // mesmo produto dentro de um kit
      { produto_id: 2, quantidade: 1, kit_id: 1 },
    ];
    const result = reduceEstoqueAposVenda(produtos, itensVenda);
    expect(result.find(p => p.id === 1).stock).toBe(7); // 10 - (1 + 2)
    expect(result.find(p => p.id === 2).stock).toBe(4); // 5 - 1
  });

  it('não altera produtos ausentes da venda', () => {
    const result = reduceEstoqueAposVenda(produtos, [{ produto_id: 1, quantidade: 1 }]);
    expect(result.find(p => p.id === 2)).toEqual(produtos[1]);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/pages/Venda.kit.test.js`
Expected: FAIL — `reduceEstoqueAposVenda` não é exportado.

- [ ] **Step 3: Implementar em `Venda.jsx`**

Inserir após `buildVendaItens`:

```jsx
/* --- Baixa de estoque local pós-venda: soma TODAS as ocorrências do
   produto na venda (pode aparecer avulso e dentro de kit(s) ao mesmo
   tempo), não só a primeira --- */
export function reduceEstoqueAposVenda(produtos, itensVenda) {
  return produtos.map(p => {
    const quantidadeVendida = itensVenda
      .filter(i => i.produto_id === p.id)
      .reduce((sum, i) => sum + i.quantidade, 0);
    return quantidadeVendida > 0 ? { ...p, stock: p.stock - quantidadeVendida } : p;
  });
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/pages/Venda.kit.test.js`
Expected: PASS (todos os testes das Tasks 1, 2 e 3)

---

### Task 4: Wiring do componente — estado, carrinho tipado, modo kit, totals e `finalizeSale`

Esta task não tem testes automatizados próprios (é wiring de UI/estado do componente React — o projeto não tem `@testing-library/react` nem ambiente `jsdom` configurado, e adicionar um não está no escopo). A verificação é manual, feita na Task 5.

**Files:**
- Modify: `src/pages/Venda.jsx` (todo o corpo do componente `Venda`, mais os dois helpers locais `rowTotal`/`rowQtyCount`)
- Modify: `src/pages/Venda.css` (novas classes para o modo kit)

**Interfaces:**
- Consumes: `canConfirmKit`, `addToKitDraft`, `changeKitDraftQty`, `removeFromKitDraft` (Task 1); `buildVendaItens` (Task 2); `reduceEstoqueAposVenda` (Task 3).
- Produces: nada consumido por tasks futuras (última task de código).

- [ ] **Step 1: Adicionar `rowTotal`/`rowQtyCount` e atualizar imports**

No topo do arquivo, atualizar o import de ícones:

```jsx
import {
  Search, SlidersHorizontal, Barcode, ShoppingCart,
  Trash2, Plus, Minus, X, CheckCircle, Layers, ChevronDown, ChevronUp
} from 'lucide-react';
```

E o import do React:

```jsx
import { useEffect, useMemo, useRef, useState } from 'react';
```

Logo após `reduceEstoqueAposVenda` (ainda fora do componente):

```jsx
function rowTotal(row) {
  return row.type === 'kit'
    ? row.components.reduce((sum, c) => sum + c.price * c.qty, 0)
    : row.price * row.qty;
}

function rowQtyCount(row) {
  return row.type === 'kit'
    ? row.components.reduce((sum, c) => sum + c.qty, 0)
    : row.qty;
}
```

- [ ] **Step 2: Adicionar estado de modo kit**

Dentro de `export default function Venda() { ... }`, após a declaração de `diasPrazo`:

```jsx
  const [kitMode, setKitMode]   = useState(false);
  const [kitDraft, setKitDraft] = useState([]);
  const kitKeyCounterRef = useRef(0);
```

- [ ] **Step 3: Tipar as linhas de carrinho avulsas e filtrar por `type` em `addToCart`/`removeFromCart`/`changeQty`**

Substituir as três funções:

```jsx
  function addToCart(product) {
    setSaveError('');
    setCart(prev => {
      const existing = prev.find(i => i.type === 'avulso' && i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(i => i.type === 'avulso' && i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { type: 'avulso', ...product, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => !(i.type === 'avulso' && i.id === id)));
  }

  function changeQty(id, delta) {
    setCart(prev => prev
      .map(i => i.type === 'avulso' && i.id === id ? { ...i, qty: Math.min(i.stock, Math.max(1, i.qty + delta)) } : i)
    );
  }
```

(`clearCart` não muda — `setCart([])` já limpa tanto linhas avulsas quanto de kit.)

- [ ] **Step 4: Handlers do modo kit**

Adicionar após `clearCart`:

```jsx
  /* --- Modo kit --- */
  function handleProductClick(product) {
    if (kitMode) {
      setKitDraft(prev => addToKitDraft(prev, product));
    } else {
      addToCart(product);
    }
  }

  function startKitMode() {
    setKitMode(true);
    setKitDraft([]);
  }

  function cancelKitMode() {
    setKitMode(false);
    setKitDraft([]);
  }

  function confirmKit() {
    if (!canConfirmKit(kitDraft)) return;
    kitKeyCounterRef.current += 1;
    setCart(prev => [...prev, {
      type: 'kit',
      kitKey: `kit-${kitKeyCounterRef.current}`,
      components: kitDraft,
      expanded: false,
    }]);
    setKitMode(false);
    setKitDraft([]);
  }

  function removeKitFromCart(kitKey) {
    setCart(prev => prev.filter(row => row.kitKey !== kitKey));
  }

  function toggleKitExpanded(kitKey) {
    setCart(prev => prev.map(row => row.type === 'kit' && row.kitKey === kitKey ? { ...row, expanded: !row.expanded } : row));
  }
```

- [ ] **Step 5: Atualizar totals e `finalizeSale`**

Substituir o bloco de totals:

```jsx
  /* --- Totals (espelha o cálculo do backend: soma qty * preço vigente) --- */
  const total     = cart.reduce((sum, row) => sum + rowTotal(row), 0);
  const itemCount = cart.reduce((sum, row) => sum + rowQtyCount(row), 0);

  const kitDraftTotal    = kitDraft.reduce((sum, i) => sum + i.price * i.qty, 0);
  const kitDraftQtyCount = kitDraft.reduce((sum, i) => sum + i.qty, 0);
```

E dentro de `finalizeSale`, substituir a chamada a `criarVenda` e a atualização de `produtos`:

```jsx
      const venda = await criarVenda({
        canal: 'loja_fisica',
        itens: buildVendaItens(cart),
        forma_pagamento: formaPagamento,
        ...(formaPagamento === 'prazo' ? { dias_prazo: Number(diasPrazo) } : {}),
      });

      setProdutos(prev => reduceEstoqueAposVenda(prev, venda.itens));
```

- [ ] **Step 6: JSX — botão "Montar kit" no header do carrinho e banner no modo kit**

Substituir o bloco `cart-header`:

```jsx
          <div className="cart-header">
            <div className="cart-header-left">
              <ShoppingCart size={18} />
              <span className="cart-title">{kitMode ? 'Montando kit' : 'Carrinho'}</span>
              {!kitMode && itemCount > 0 && (
                <span className="cart-count">{itemCount}</span>
              )}
            </div>
            {!kitMode && (
              <div className="cart-header-actions">
                <button className="btn btn-ghost btn-sm cart-kit-btn" onClick={startKitMode}>
                  <Layers size={14} />
                  Montar kit
                </button>
                {cart.length > 0 && (
                  <button className="btn btn-ghost btn-sm cart-clear-btn" onClick={clearCart}>
                    <Trash2 size={14} />
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>
```

Adicionar o banner de modo kit na coluna de produtos, logo após `venda-search-row` e antes de `venda-categories`:

```jsx
          {kitMode && (
            <div className="kit-mode-banner">
              <Layers size={14} />
              Modo kit: clique nos produtos para adicionar ao kit
            </div>
          )}
```

E trocar `onAddToCart={addToCart}` por `onAddToCart={handleProductClick}` no `<ProductCard />`.

- [ ] **Step 7: JSX — painel de montagem de kit (substitui cart-items/cart-summary enquanto `kitMode`)**

Envolver o bloco atual de `cart-items` + `cart-summary` (dentro de `venda-cart-col`) numa renderização condicional: `{kitMode ? (<>...painel de kit...</>) : (<>...cart-items/cart-summary atuais...</>)}`.

Painel de kit:

```jsx
          {kitMode ? (
            <>
              <div className="cart-items">
                {kitDraft.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Layers size={22} /></div>
                    <div className="empty-state-title">Nenhum componente ainda</div>
                    <p className="text-xs text-secondary">Clique nos produtos da vitrine para montar o kit</p>
                  </div>
                ) : (
                  kitDraft.map(item => (
                    <div key={item.id} className="cart-item">
                      <div
                        className="cart-item-thumb"
                        style={{ background: `linear-gradient(135deg, ${item.color}33, ${item.color}77)` }}
                      >
                        <span style={{ color: item.color, fontSize: 12, fontWeight: 800 }}>
                          {item.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
                        </span>
                      </div>
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.name}</div>
                        <div className="cart-item-sku">{item.sku}</div>
                      </div>
                      <div className="cart-item-controls">
                        <button
                          className="cart-qty-btn"
                          onClick={() => setKitDraft(prev => item.qty === 1
                            ? removeFromKitDraft(prev, item.id)
                            : changeKitDraftQty(prev, item.id, -1))}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={11} strokeWidth={3} />
                        </button>
                        <span className="cart-qty">{item.qty}</span>
                        <button
                          className="cart-qty-btn"
                          onClick={() => setKitDraft(prev => changeKitDraftQty(prev, item.id, 1))}
                          disabled={item.qty >= item.stock}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={11} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="cart-item-price">
                        {(item.price * item.qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <button
                        className="cart-item-remove"
                        onClick={() => setKitDraft(prev => removeFromKitDraft(prev, item.id))}
                        aria-label="Remover componente"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="cart-summary">
                <div className="cart-total-row">
                  <span className="cart-total-label">Total do kit ({kitDraftQtyCount} itens)</span>
                  <span className="cart-total-value">
                    {kitDraftTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="kit-draft-actions">
                  <button className="btn btn-ghost" onClick={cancelKitMode}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={confirmKit}
                    disabled={!canConfirmKit(kitDraft)}
                  >
                    Confirmar kit
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* cart-items / cart-summary do modo normal — ver Step 8, que
                 substitui este comentário pelo bloco completo */}
            </>
          )}
```

- [ ] **Step 8: JSX — carrinho normal (branch por `row.type`), mantendo comportamento atual para avulsos**

Substituir o placeholder do Step 7 (o `<>...</>` do branch `else`) pelo bloco completo abaixo — `cart-items` agora mapeia `row` em vez de `item`, com um branch por tipo, e `cart-summary` é **idêntico** ao arquivo original (mensagem de erro, forma de pagamento, total, botão "Finalizar Venda" — nada mudou ali):

```jsx
              <div className="cart-items">
                {cart.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <ShoppingCart size={22} />
                    </div>
                    <div className="empty-state-title">Carrinho vazio</div>
                    <p className="text-xs text-secondary">Adicione produtos ao carrinho</p>
                  </div>
                ) : (
                  cart.map(row => row.type === 'kit' ? (
                    <div key={row.kitKey} className="cart-item cart-item--kit">
                      <div className="cart-item-kit-header">
                        <div className="cart-item-thumb cart-item-thumb--kit">
                          <Layers size={16} />
                        </div>
                        <div className="cart-item-info">
                          <div className="cart-item-name">Kit ({rowQtyCount(row)} itens)</div>
                          <button
                            className="cart-kit-toggle"
                            onClick={() => toggleKitExpanded(row.kitKey)}
                          >
                            {row.expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {row.expanded ? 'Ocultar itens' : 'Ver itens'}
                          </button>
                        </div>
                        <div className="cart-item-price">
                          {rowTotal(row).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <button
                          className="cart-item-remove"
                          onClick={() => removeKitFromCart(row.kitKey)}
                          aria-label="Remover kit"
                        >
                          <X size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                      {row.expanded && (
                        <div className="cart-kit-components">
                          {row.components.map(c => (
                            <div key={c.id} className="cart-kit-component">
                              <span className="cart-kit-component-name">{c.name}</span>
                              <span className="cart-kit-component-qty">x{c.qty}</span>
                              <span className="cart-kit-component-price">
                                {(c.price * c.qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={row.id} className="cart-item">
                      <div
                        className="cart-item-thumb"
                        style={{ background: `linear-gradient(135deg, ${row.color}33, ${row.color}77)` }}
                      >
                        <span style={{ color: row.color, fontSize: 12, fontWeight: 800 }}>
                          {row.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
                        </span>
                      </div>
                      <div className="cart-item-info">
                        <div className="cart-item-name">{row.name}</div>
                        <div className="cart-item-sku">{row.sku}</div>
                      </div>
                      <div className="cart-item-controls">
                        <button
                          className="cart-qty-btn"
                          onClick={() => row.qty === 1 ? removeFromCart(row.id) : changeQty(row.id, -1)}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={11} strokeWidth={3} />
                        </button>
                        <span className="cart-qty">{row.qty}</span>
                        <button
                          className="cart-qty-btn"
                          onClick={() => changeQty(row.id, 1)}
                          disabled={row.qty >= row.stock}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={11} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="cart-item-price">
                        {(row.price * row.qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <button
                        className="cart-item-remove"
                        onClick={() => removeFromCart(row.id)}
                        aria-label="Remover item"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="cart-summary">
                {saveError && (
                  <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{saveError}</p>
                )}

                {/* Forma de pagamento */}
                <div className="payment-row">
                  <div className="payment-toggle-group">
                    <button
                      type="button"
                      className={`payment-toggle ${formaPagamento === 'a_vista' ? 'payment-toggle--active' : ''}`}
                      onClick={() => { setFormaPagamento('a_vista'); setSaveError(''); }}
                    >À vista</button>
                    <button
                      type="button"
                      className={`payment-toggle ${formaPagamento === 'prazo' ? 'payment-toggle--active' : ''}`}
                      onClick={() => { setFormaPagamento('prazo'); setSaveError(''); }}
                    >A prazo</button>
                  </div>
                  {formaPagamento === 'prazo' && (
                    <div className="payment-days">
                      <label className="text-xs" htmlFor="dias-prazo">Dias de prazo</label>
                      <input
                        id="dias-prazo"
                        type="number"
                        min={1}
                        value={diasPrazo}
                        onChange={e => setDiasPrazo(e.target.value)}
                        className="payment-days-input"
                      />
                    </div>
                  )}
                </div>

                <div className="cart-total-row">
                  <span className="cart-total-label">Total</span>
                  <span className="cart-total-value">
                    {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <button
                  className="btn btn-primary btn-full btn-lg cart-finalize-btn"
                  onClick={finalizeSale}
                  disabled={cart.length === 0 || saving}
                  id="btn-finalizar-venda"
                >
                  <CheckCircle size={18} />
                  {saving ? 'Finalizando...' : 'Finalizar Venda'}
                </button>
              </div>
            </>
          )}
```

Este bloco inteiro (Steps 7 e 8 juntos) substitui, dentro de `venda-cart-col`, tudo que vinha depois do `cart-header` no arquivo original — ou seja, o antigo `cart-items` + `cart-summary` únicos dão lugar a este `{kitMode ? (...) : (...)}`.

- [ ] **Step 9: CSS — novas classes em `Venda.css`**

Adicionar ao final de `src/pages/Venda.css` (antes do bloco `@media` de responsivo, ou depois — não interfere):

```css
/* ===== MODO KIT ===== */
.kit-mode-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--color-primary-ultra);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.cart-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.cart-kit-btn {
  color: var(--color-text-secondary);
  gap: 4px;
}

.cart-kit-btn:hover {
  color: var(--color-primary);
  background: var(--color-primary-ultra);
  border-color: transparent;
}

.kit-draft-actions {
  display: flex;
  gap: var(--space-2);
}

.kit-draft-actions .btn {
  flex: 1;
}

/* Linha de kit agrupada no carrinho */
.cart-item--kit {
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
}

.cart-item-kit-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.cart-item-thumb--kit {
  background: var(--color-primary-ultra);
  color: var(--color-primary);
}

.cart-kit-toggle {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-top: 2px;
}

.cart-kit-toggle:hover {
  color: var(--color-primary);
}

.cart-kit-components {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-2) var(--space-2) 0 48px;
  border-top: 1px dashed var(--color-border-light);
}

.cart-kit-component {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.cart-kit-component-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-kit-component-qty {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.cart-kit-component-price {
  font-weight: 600;
  color: var(--color-text-primary);
  flex-shrink: 0;
}
```

- [ ] **Step 10: Rodar a suíte completa e confirmar que nada quebrou**

Run: `npx vitest run`
Expected: PASS (todos os testes de `Venda.kit.test.js` das Tasks 1-3, mais `access.test.js`)

Run: `npx oxlint src/pages/Venda.jsx src/pages/Venda.css`
Expected: sem erros novos

---

### Task 5: Verificação manual e commit único

**Files:** nenhum (só execução e, ao final, commit de tudo que foi criado/modificado nas Tasks 1-4).

- [ ] **Step 1: Rodar build de produção**

Run: `npm run build`
Expected: build conclui sem erros

- [ ] **Step 2: Subir backend e frontend localmente e testar manualmente no navegador**

Roteiro para o usuário (Luis) executar:

1. Login como `bruno@cherry.com` / `senha123` (vendedor) e também como `ana@cherry.com` / `senha123` (admin) — confirmar que nenhum campo de custo/margem aparece em nenhum momento do fluxo de kit, para nenhum dos dois papéis.
2. Montar um kit de 2 produtos distintos, confirmar, e verificar a linha agrupada "Kit (N itens)" no carrinho com o valor somado dos componentes.
3. Expandir a linha do kit no carrinho e conferir que os componentes individuais aparecem corretamente (nome, quantidade, preço).
4. Montar 2 kits + 1 item avulso na mesma venda, finalizar, e no histórico de vendas conferir que o `kit_id` está correto por grupo (1 para o primeiro kit, 2 para o segundo, ausente no avulso) e que o estoque foi baixado corretamente para cada produto.
5. Tentar confirmar um kit com 1 produto só (mesmo aumentando a quantidade) — o botão "Confirmar kit" deve permanecer desabilitado.
6. Cancelar o modo kit no meio da montagem e confirmar que o carrinho (itens que já estavam lá antes) não foi alterado.
7. Vender o mesmo produto avulso E dentro de um kit na mesma venda; depois de finalizar, confirmar que o estoque exibido na vitrine descontou a soma certa (avulso + componente do kit).

- [ ] **Step 3: Commit único de toda a feature**

```bash
git add src/pages/Venda.jsx src/pages/Venda.css src/pages/Venda.kit.test.js docs/superpowers/plans/2026-09-09-kit-vendas.md
git commit -m "$(cat <<'EOF'
feat(vendas): adiciona modo de montagem de kit na tela de venda

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WSrcJGjzUdnidvjgqwPe2q
EOF
)"
```

- [ ] **Step 4: Confirmar o commit**

Run: `git status` e `git log -1 --stat`
Expected: working tree limpo, commit mostra `Venda.jsx`, `Venda.css`, `Venda.kit.test.js` e o plano modificados/criados.
