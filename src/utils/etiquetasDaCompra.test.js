import { describe, expect, it } from 'vitest';
import { itensEtiquetaDaCompra } from './etiquetasDaCompra';

const produtos = [{ id: 1, nome: 'Brinco A' }, { id: 2, nome: 'Colar B' }];

describe('itensEtiquetaDaCompra', () => {
  it('usa a quantidade comprada de cada produto', () => {
    expect(itensEtiquetaDaCompra([{ produto_id: 1, quantidade: 4 }, { produto_id: 2, quantidade: 1 }], produtos)).toEqual([
      { produto_id: 1, nome: 'Brinco A', quantidade: 4 },
      { produto_id: 2, nome: 'Colar B', quantidade: 1 },
    ]);
  });

  it('soma o mesmo produto em duas linhas da compra', () => {
    expect(itensEtiquetaDaCompra([{ produto_id: 1, quantidade: 4 }, { produto_id: 1, quantidade: 3 }], produtos)).toEqual([
      { produto_id: 1, nome: 'Brinco A', quantidade: 7 },
    ]);
  });

  it('ignora produto desconhecido e quantidade inválida', () => {
    expect(itensEtiquetaDaCompra([{ produto_id: 9, quantidade: 2 }, { produto_id: 1, quantidade: 0 }, { produto_id: 2, quantidade: 1.5 }], produtos)).toEqual([]);
  });

  it('aceita entrada vazia', () => {
    expect(itensEtiquetaDaCompra(undefined, produtos)).toEqual([]);
    expect(itensEtiquetaDaCompra([{ produto_id: 1, quantidade: 2 }], undefined)).toEqual([]);
  });
});
