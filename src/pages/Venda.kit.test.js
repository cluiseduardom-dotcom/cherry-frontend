import { describe, it, expect } from 'vitest';
import {
  canConfirmKit,
  addToKitDraft,
  changeKitDraftQty,
  removeFromKitDraft,
  buildVendaItens,
  reduceEstoqueAposVenda,
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
