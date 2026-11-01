import { describe, it, expect } from 'vitest';
import {
  FILTROS_PADRAO, ORDENACOES, aplicarFiltrosVitrine, contarFiltrosAtivos, lerPreco, validarFaixaDePreco,
} from './filtrosVitrine';

const produtos = [
  { id: 1, name: 'Boné', price: 39.9, stock: 4 },
  { id: 2, name: 'água', price: 5, stock: 0 },
  { id: 3, name: 'Caneca', price: 29.9, stock: 118 },
  { id: 4, name: 'Brinde sem preço', price: null, stock: 10 },
];
const ids = (lista) => lista.map(p => p.id);

describe('lerPreco', () => {
  it('aceita vírgula, ponto e espaços', () => {
    expect(lerPreco('12,50')).toBe(12.5);
    expect(lerPreco(' 12.5 ')).toBe(12.5);
    expect(lerPreco('0')).toBe(0);
  });

  it('vazio, negativo e texto viram null (filtro desligado)', () => {
    for (const v of ['', '   ', null, undefined, '-3', 'abc', '1,2,3']) expect(lerPreco(v), String(v)).toBeNull();
  });
});

describe('aplicarFiltrosVitrine', () => {
  it('filtros padrão não mudam nada e devolvem uma lista nova', () => {
    const r = aplicarFiltrosVitrine(produtos, FILTROS_PADRAO);
    expect(ids(r)).toEqual([1, 2, 3, 4]);
    expect(r).not.toBe(produtos);
  });

  it('somente com estoque tira os zerados', () => {
    expect(ids(aplicarFiltrosVitrine(produtos, { somenteComEstoque: true }))).toEqual([1, 3, 4]);
  });

  it('faixa de preço: mínimo, máximo e os dois; produto sem preço sai quando há faixa', () => {
    expect(ids(aplicarFiltrosVitrine(produtos, { precoMin: '30' }))).toEqual([1]);
    expect(ids(aplicarFiltrosVitrine(produtos, { precoMax: '30' }))).toEqual([2, 3]);
    expect(ids(aplicarFiltrosVitrine(produtos, { precoMin: '5', precoMax: '29,9' }))).toEqual([2, 3]);
  });

  it('faixa invertida é ignorada em vez de esvaziar a vitrine', () => {
    expect(ids(aplicarFiltrosVitrine(produtos, { precoMin: '50', precoMax: '10' }))).toEqual([1, 2, 3, 4]);
  });

  it('ordena por nome sem diferenciar maiúscula/acento, por preço (sem preço por último) e por estoque', () => {
    expect(ids(aplicarFiltrosVitrine(produtos, { ordenar: 'nome' }))).toEqual([2, 1, 4, 3]);
    expect(ids(aplicarFiltrosVitrine(produtos, { ordenar: 'menor_preco' }))).toEqual([2, 3, 1, 4]);
    expect(ids(aplicarFiltrosVitrine(produtos, { ordenar: 'maior_preco' }))).toEqual([1, 3, 2, 4]);
    expect(ids(aplicarFiltrosVitrine(produtos, { ordenar: 'maior_estoque' }))).toEqual([3, 4, 1, 2]);
  });

  it('combina filtro e ordenação sem alterar a lista original', () => {
    const copia = JSON.stringify(produtos);
    const r = aplicarFiltrosVitrine(produtos, { somenteComEstoque: true, ordenar: 'menor_preco' });
    expect(ids(r)).toEqual([3, 1, 4]);
    expect(JSON.stringify(produtos)).toBe(copia);
  });

  it('ordenação desconhecida mantém a ordem original', () => {
    expect(ids(aplicarFiltrosVitrine(produtos, { ordenar: 'xpto' }))).toEqual([1, 2, 3, 4]);
  });
});

describe('contarFiltrosAtivos e validação', () => {
  it('conta ordenação, estoque e cada ponta da faixa', () => {
    expect(contarFiltrosAtivos(FILTROS_PADRAO)).toBe(0);
    expect(contarFiltrosAtivos({ ordenar: 'nome' })).toBe(1);
    expect(contarFiltrosAtivos({ ordenar: 'nome', somenteComEstoque: true, precoMin: '1', precoMax: '2' })).toBe(4);
    expect(contarFiltrosAtivos({ precoMin: 'abc' })).toBe(0);
  });

  it('validarFaixaDePreco explica o erro', () => {
    expect(validarFaixaDePreco({ precoMin: '', precoMax: '' })).toBe('');
    expect(validarFaixaDePreco({ precoMin: 'x', precoMax: '' })).toMatch(/mínimo inválido/);
    expect(validarFaixaDePreco({ precoMin: '', precoMax: '-1' })).toMatch(/máximo inválido/);
    expect(validarFaixaDePreco({ precoMin: '10', precoMax: '5' })).toMatch(/maior que o máximo/);
  });

  it('a lista de ordenações começa pelo padrão', () => {
    expect(ORDENACOES[0].valor).toBe('padrao');
  });
});
