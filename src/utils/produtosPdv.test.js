import { describe, it, expect } from 'vitest';
import { selecionarProdutosPdv } from './produtosPdv.js';

const p = (id, extra = {}) => ({ id, name: `P${id}`, price: 10, stock: 5, tipo: 'acabado', ...extra });

describe('selecionarProdutosPdv', () => {
  it('mantém produtos com preço e estoque na ordem original', () => {
    expect(selecionarProdutosPdv([p(1), p(2), p(3)]).map(x => x.id)).toEqual([1, 2, 3]);
  });

  it('esgotados continuam visíveis, mas vão para o final', () => {
    const r = selecionarProdutosPdv([p(1, { stock: 0 }), p(2), p(3, { stock: 0 }), p(4)]);
    expect(r.map(x => x.id)).toEqual([2, 4, 1, 3]);
  });

  it('oculta produto sem preço no canal', () => {
    expect(selecionarProdutosPdv([p(1), p(2, { price: null })]).map(x => x.id)).toEqual([1]);
  });

  it('oculta sem preço mesmo quando também está esgotado', () => {
    expect(selecionarProdutosPdv([p(1, { price: null, stock: 0 })])).toEqual([]);
  });

  it('oculta insumos / materiais internos, mesmo com preço e estoque', () => {
    expect(selecionarProdutosPdv([p(1, { tipo: 'insumo' }), p(2)]).map(x => x.id)).toEqual([2]);
  });

  it('produto sem o campo tipo (resposta antiga) continua comercializável', () => {
    expect(selecionarProdutosPdv([p(1, { tipo: undefined })]).map(x => x.id)).toEqual([1]);
  });

  it('não muta a lista original', () => {
    const original = [p(1, { stock: 0 }), p(2)];
    selecionarProdutosPdv(original);
    expect(original.map(x => x.id)).toEqual([1, 2]);
  });
});
