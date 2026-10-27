import { describe, it, expect } from 'vitest';
import {
  chaveDeLidos, lerLidos, salvarLidos, podarLidos, contarNaoLidos, marcarLido,
  marcarTodosLidos, rotuloContador, rotuloDoTipo, destinoDoAviso,
} from './notificacoes';

const itens = [{ id: 'falta:1' }, { id: 'parado:2' }, { id: 'alto_giro:3' }];

describe('utils/notificacoes', () => {
  it('chave de lidos é por usuário', () => {
    expect(chaveDeLidos({ id: 7 })).toBe('vertumno:avisos-lidos:7');
    expect(chaveDeLidos(null)).toBe('vertumno:avisos-lidos:anonimo');
  });

  it('lerLidos tolera storage quebrado, JSON inválido e lixo', () => {
    expect(lerLidos({ getItem: () => { throw new Error('bloqueado'); } }, 'k')).toEqual([]);
    expect(lerLidos({ getItem: () => '{nao-json' }, 'k')).toEqual([]);
    expect(lerLidos({ getItem: () => '{"a":1}' }, 'k')).toEqual([]);
    expect(lerLidos({ getItem: () => '["a",1,"b"]' }, 'k')).toEqual(['a', 'b']);
    expect(lerLidos({ getItem: () => null }, 'k')).toEqual([]);
  });

  it('salvarLidos grava JSON e não quebra sem storage', () => {
    const gravado = {};
    salvarLidos({ setItem: (k, v) => { gravado[k] = v; } }, 'k', ['a']);
    expect(gravado.k).toBe('["a"]');
    expect(() => salvarLidos({ setItem: () => { throw new Error('cheio'); } }, 'k', ['a'])).not.toThrow();
  });

  it('podarLidos esquece avisos que não existem mais', () => {
    expect(podarLidos(['falta:1', 'velho:9'], itens)).toEqual(['falta:1']);
  });

  it('contarNaoLidos ignora os lidos', () => {
    expect(contarNaoLidos(itens, [])).toBe(3);
    expect(contarNaoLidos(itens, ['falta:1', 'x:0'])).toBe(2);
  });

  it('marcarLido não duplica; marcarTodosLidos junta tudo sem repetir', () => {
    expect(marcarLido(['a'], 'a')).toEqual(['a']);
    expect(marcarLido(['a'], 'b')).toEqual(['a', 'b']);
    expect(marcarTodosLidos(['falta:1'], itens).sort()).toEqual(['alto_giro:3', 'falta:1', 'parado:2']);
  });

  it('rotuloContador: vazio com zero, 9+ acima de nove', () => {
    expect(rotuloContador(0)).toBe('');
    expect(rotuloContador(4)).toBe('4');
    expect(rotuloContador(9)).toBe('9');
    expect(rotuloContador(10)).toBe('9+');
  });

  it('rotuloDoTipo tem fallback', () => {
    expect(rotuloDoTipo('falta')).toBe('Em falta');
    expect(rotuloDoTipo('novo_tipo')).toBe('Aviso');
  });

  it('destinoDoAviso: estoque só para quem vê estoque', () => {
    expect(destinoDoAviso({ tipo: 'falta' }, true)).toBe('/estoque');
    expect(destinoDoAviso({ tipo: 'falta' }, false)).toBe('/produtos');
    expect(destinoDoAviso({ tipo: 'parado' }, true)).toBe('/produtos');
  });
});
