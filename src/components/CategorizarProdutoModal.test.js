import { describe, it, expect } from 'vitest';
import {
  agruparCategoriasPorNivel,
  rotuloNivel,
  selecaoInicial,
  montarCategoriaIds,
} from './CategorizarProdutoModal.jsx';

describe('agruparCategoriasPorNivel', () => {
  it('agrupa por nivel e ordena os grupos ascendente', () => {
    const categorias = [
      { id: 3, nivel: 2, codigo: 'PR', nome: 'Prata' },
      { id: 1, nivel: 1, codigo: 'BR', nome: 'Brinco' },
      { id: 2, nivel: 1, codigo: 'CO', nome: 'Colar' },
    ];
    expect(agruparCategoriasPorNivel(categorias)).toEqual([
      { nivel: 1, categorias: [categorias[1], categorias[2]] },
      { nivel: 2, categorias: [categorias[0]] },
    ]);
  });

  it('retorna array vazio quando não há categorias — empresa ainda não cadastrou nenhuma', () => {
    expect(agruparCategoriasPorNivel([])).toEqual([]);
  });
});

describe('rotuloNivel', () => {
  it('usa o nome cadastrado quando existe', () => {
    expect(rotuloNivel(1, [{ nivel: 1, nome: 'Família' }])).toBe('Família');
  });

  it('cai para "Nível N" quando não há rótulo cadastrado — estado normal, não erro', () => {
    expect(rotuloNivel(2, [])).toBe('Nível 2');
    expect(rotuloNivel(3, [{ nivel: 1, nome: 'Família' }])).toBe('Nível 3');
  });
});

describe('selecaoInicial', () => {
  it('monta um mapa nivel -> categoria_id a partir das categorias já vinculadas ao produto', () => {
    expect(selecaoInicial([{ id: 5, nivel: 1 }, { id: 9, nivel: 2 }])).toEqual({ 1: 5, 2: 9 });
  });

  it('retorna objeto vazio quando o produto ainda não tem categorias', () => {
    expect(selecaoInicial(undefined)).toEqual({});
    expect(selecaoInicial([])).toEqual({});
  });
});

describe('montarCategoriaIds', () => {
  it('nunca produz dois ids para o mesmo nível — a seleção é estruturalmente um id por nível (um <select> por nível)', () => {
    const selecao = { 1: 5, 2: 9, 3: null };
    const ids = montarCategoriaIds(selecao);
    expect(ids).toEqual([5, 9]);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('ignora níveis sem seleção', () => {
    expect(montarCategoriaIds({ 1: null, 2: null })).toEqual([]);
  });
});
