import { describe, expect, test } from 'vitest';
import {
  aplicarSaldosNosProdutos, locaisDeVenda, localPadraoDeVenda, mapaDeSaldos, reduzirSaldosAposVenda,
} from './locaisVenda';

const central = { id: 1, tipo: 'central', nome: 'Central' };
const minha = { id: 2, tipo: 'maleta', nome: 'Maleta Ana', usuario_id: 10 };
const alheia = { id: 3, tipo: 'maleta', nome: 'Maleta Beto', usuario_id: 11 };
const consignado = { id: 4, tipo: 'consignado', nome: 'Loja' };

describe('locaisDeVenda', () => {
  test('oferece só o Central e a própria maleta, maleta primeiro', () => {
    expect(locaisDeVenda([central, alheia, consignado, minha], 10)).toEqual([minha, central]);
  });

  test('admin/equipe também só vende do Central ou da própria maleta', () => {
    expect(locaisDeVenda([central, minha, alheia, consignado], 99)).toEqual([central]);
  });

  test('tolera lista inválida e id numérico como texto', () => {
    expect(locaisDeVenda(undefined, 10)).toEqual([]);
    expect(locaisDeVenda([minha], '10')).toEqual([minha]);
    expect(locaisDeVenda([minha], null)).toEqual([]);
  });
});

describe('localPadraoDeVenda', () => {
  test('maleta própria se houver, senão Central, senão null', () => {
    expect(localPadraoDeVenda(locaisDeVenda([central, minha], 10))).toBe(minha);
    expect(localPadraoDeVenda(locaisDeVenda([central], 10))).toBe(central);
    expect(localPadraoDeVenda([])).toBeNull();
  });
});

describe('saldos', () => {
  const produtos = [{ id: 1, stock: 50 }, { id: 2, stock: 8 }, { id: 3, stock: 4 }];

  test('mapaDeSaldos converte lista em mapa numérico', () => {
    expect(mapaDeSaldos([{ produto_id: 1, saldo: '3' }, { produto_id: 2, saldo: 5 }])).toEqual({ 1: 3, 2: 5 });
    expect(mapaDeSaldos(undefined)).toEqual({});
  });

  test('estoque do PDV é o saldo do local; ausente = 0', () => {
    expect(aplicarSaldosNosProdutos(produtos, { 1: 3, 2: 5 }).map((p) => p.stock)).toEqual([3, 5, 0]);
  });

  test('sem saldos (sem local) mantém o catálogo', () => {
    expect(aplicarSaldosNosProdutos(produtos, null)).toBe(produtos);
  });

  test('baixa soma avulso + kit do mesmo produto e nunca fica negativa', () => {
    const itens = [{ produto_id: 1, quantidade: 2 }, { produto_id: 1, quantidade: 1, kit_id: 1 }, { produto_id: 9, quantidade: 1 }];
    expect(reduzirSaldosAposVenda({ 1: 3, 2: 5 }, itens)).toEqual({ 1: 0, 2: 5, 9: 0 });
    expect(reduzirSaldosAposVenda(null, itens)).toBeNull();
  });
});
