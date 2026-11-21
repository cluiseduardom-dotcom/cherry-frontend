import { describe, it, expect } from 'vitest';
import { agruparPorGrade, rotuloDaVariacao, tituloDaGrade } from './gradePdv';

const camisa = (id, tam, extra = {}) => ({ id, name: `Camiseta ${tam}`, sku: `CAM-${tam}`, price: 50, stock: 3, grade_id: 7, variacao: { Tamanho: tam }, ...extra });
const solto = { id: 99, name: 'Ecobag', sku: 'ECO', price: 25, stock: 9, grade_id: null };

describe('título e rótulo da variação', () => {
  it('tira os valores do fim do nome; com dois eixos usa " / "', () => {
    expect(tituloDaGrade(camisa(1, 'P'))).toBe('Camiseta');
    expect(tituloDaGrade({ name: 'Camiseta Azul / P', variacao: { Cor: 'Azul', Tamanho: 'P' } })).toBe('Camiseta');
    expect(rotuloDaVariacao({ name: 'x', variacao: { Cor: 'Azul', Tamanho: 'P' } })).toBe('Azul / P');
  });

  it('nome que não termina nos valores fica como está', () => {
    expect(tituloDaGrade({ name: 'Camiseta Especial', variacao: { Tamanho: 'P' } })).toBe('Camiseta Especial');
    expect(rotuloDaVariacao({ name: 'Camiseta Especial', variacao: null })).toBe('Camiseta Especial');
  });
});

describe('agruparPorGrade', () => {
  it('troca as variações por um cartão, na posição da primeira, somando estoque e usando o menor preço', () => {
    const lista = [solto, camisa(1, 'P', { price: 50 }), camisa(2, 'M', { price: 55, stock: 0 }), camisa(3, 'G', { price: 60, stock: 4 })];
    const r = agruparPorGrade(lista);

    expect(r).toHaveLength(2);
    expect(r[0]).toBe(solto);
    expect(r[1]).toMatchObject({ id: 'grade-7', ehGrade: true, name: 'Camiseta', sku: '3 variações', price: 50, precoVaria: true, stock: 7 });
    expect(r[1].variacoes.map((v) => v.id)).toEqual([1, 2, 3]);
  });

  it('preço igual em todas: precoVaria falso; variação sem preço não entra no menor preço', () => {
    expect(agruparPorGrade([camisa(1, 'P'), camisa(2, 'M')])[0]).toMatchObject({ price: 50, precoVaria: false });
    expect(agruparPorGrade([camisa(1, 'P', { price: null }), camisa(2, 'M', { price: 40 })])[0].price).toBe(40);
  });

  it('grade com uma só variação visível e produto sem grade ficam como estão; mistura de grades não se junta', () => {
    const unica = camisa(1, 'P');
    expect(agruparPorGrade([unica, solto])).toEqual([unica, solto]);

    const outra = { ...camisa(5, 'P'), grade_id: 8, name: 'Calça P' };
    const r = agruparPorGrade([camisa(1, 'P'), outra, camisa(2, 'M')]);
    expect(r.map((x) => x.id)).toEqual(['grade-7', 5]);
  });

  it('não altera a lista original e é vazio para lista vazia', () => {
    const lista = [camisa(1, 'P'), camisa(2, 'M')];
    agruparPorGrade(lista);
    expect(lista).toHaveLength(2);
    expect(agruparPorGrade([])).toEqual([]);
  });
});
