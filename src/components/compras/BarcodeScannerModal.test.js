import { describe, it, expect } from 'vitest';
import { encontrarProdutoPorCodigo } from './BarcodeScannerModal.jsx';

const produtos = [
  { id: 1, sku: 'COL-0042', nome: 'Colar Corrente Veneziana' },
  { id: 2, sku: 'bri-0018', nome: 'Brinco Pérola Natural' },
  { id: 3, sku: null, nome: 'Produto sem SKU' },
];

describe('encontrarProdutoPorCodigo', () => {
  it('encontra por SKU exato', () => {
    expect(encontrarProdutoPorCodigo(produtos, 'COL-0042')).toEqual(produtos[0]);
  });

  it('é case-insensitive e ignora espaços nas pontas', () => {
    expect(encontrarProdutoPorCodigo(produtos, '  BRI-0018  ')).toEqual(produtos[1]);
    expect(encontrarProdutoPorCodigo(produtos, 'bri-0018')).toEqual(produtos[1]);
  });

  it('retorna null quando não encontra correspondência', () => {
    expect(encontrarProdutoPorCodigo(produtos, 'INEXISTENTE')).toBeNull();
  });

  it('não quebra com produtos sem sku, código vazio ou lista inválida', () => {
    expect(encontrarProdutoPorCodigo(produtos, '')).toBeNull();
    expect(encontrarProdutoPorCodigo(produtos, null)).toBeNull();
    expect(encontrarProdutoPorCodigo(undefined, 'COL-0042')).toBeNull();
    expect(encontrarProdutoPorCodigo(produtos, 'null')).not.toEqual(produtos[2]);
  });
});
