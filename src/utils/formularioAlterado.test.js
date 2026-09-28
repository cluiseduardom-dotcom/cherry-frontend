import { describe, it, expect } from 'vitest';
import { formularioAlterado } from './formularioAlterado';

describe('formularioAlterado', () => {
  it('retorna false quando o formulário é idêntico ao estado inicial', () => {
    const inicial = { nome: '', telefone: '', email: '' };
    const atual = { nome: '', telefone: '', email: '' };
    expect(formularioAlterado(atual, inicial)).toBe(false);
  });

  it('retorna true quando um campo de texto muda', () => {
    const inicial = { nome: '', telefone: '' };
    const atual = { nome: 'Fornecedor ABC', telefone: '' };
    expect(formularioAlterado(atual, inicial)).toBe(true);
  });

  it('detecta mudança em array aninhado (ex: itens de uma compra)', () => {
    const inicial = { itens: [{ produto_id: '', quantidade: 1 }] };
    const atualMesmo = { itens: [{ produto_id: '', quantidade: 1 }] };
    const atualMudou = { itens: [{ produto_id: '5', quantidade: 1 }] };
    expect(formularioAlterado(atualMesmo, inicial)).toBe(false);
    expect(formularioAlterado(atualMudou, inicial)).toBe(true);
  });

  it('detecta item adicionado ou removido de um array', () => {
    const inicial = { itens: [{ id: 1 }] };
    const comItemAMais = { itens: [{ id: 1 }, { id: 2 }] };
    expect(formularioAlterado(comItemAMais, inicial)).toBe(true);
  });

  it('não é sensível à ordem das chaves do objeto', () => {
    const inicial = { a: 1, b: 2 };
    const atual = { b: 2, a: 1 };
    expect(formularioAlterado(atual, inicial)).toBe(false);
  });

  it('detecta mudança de boolean/number', () => {
    expect(formularioAlterado({ ativo: false }, { ativo: true })).toBe(true);
    expect(formularioAlterado({ qtd: 2 }, { qtd: 1 })).toBe(true);
  });

  it('trata null/undefined como iguais entre si mas diferentes de valores preenchidos', () => {
    expect(formularioAlterado({ x: null }, { x: null })).toBe(false);
    expect(formularioAlterado({ x: undefined }, { x: undefined })).toBe(false);
    expect(formularioAlterado({ x: null }, { x: 'algo' })).toBe(true);
  });
});
