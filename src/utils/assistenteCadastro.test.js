import { describe, it, expect } from 'vitest';
import {
  passosDoAssistente,
  proximoPasso,
  temPrecoDefinido,
  podeLancarEstoqueInicial,
} from './assistenteCadastro.js';

const tudo = { podeFotos: true, podeCategorizar: true, podePreco: true, podeEstoqueInicial: true };

describe('assistenteCadastro', () => {
  it('lista os passos na ordem fotos, categoria, preço, estoque', () => {
    expect(passosDoAssistente(tudo)).toEqual(['fotos', 'categoria', 'preco', 'estoque']);
  });

  it('omite o passo sem permissão', () => {
    expect(passosDoAssistente({ ...tudo, podeEstoqueInicial: false, podePreco: false })).toEqual(['fotos', 'categoria']);
    expect(passosDoAssistente({})).toEqual([]);
  });

  it('proximoPasso devolve o primeiro pendente ou null', () => {
    const passos = ['fotos', 'categoria', 'preco'];
    expect(proximoPasso(passos, {})).toBe('fotos');
    expect(proximoPasso(passos, { fotos: true })).toBe('categoria');
    expect(proximoPasso(passos, { fotos: true, preco: true })).toBe('categoria');
    expect(proximoPasso(passos, { fotos: true, categoria: true, preco: true })).toBeNull();
  });

  it('temPrecoDefinido: basta um canal com preço de venda', () => {
    expect(temPrecoDefinido([{ preco_venda: null }, { preco_venda: '12.50' }])).toBe(true);
    expect(temPrecoDefinido([{ preco_venda: null }])).toBe(false);
    expect(temPrecoDefinido(undefined)).toBe(false);
  });

  it('estoque inicial só para admin', () => {
    expect(podeLancarEstoqueInicial({ role: 'admin' })).toBe(true);
    expect(podeLancarEstoqueInicial({ perfil: 'admin' })).toBe(true);
    expect(podeLancarEstoqueInicial({ role: 'estoquista' })).toBe(false);
    expect(podeLancarEstoqueInicial(null)).toBe(false);
  });
});
