import { describe, it, expect } from 'vitest';
import { doTipo, tipoDoProduto } from './tipoProduto.js';

describe('tipoDoProduto / doTipo', () => {
  it('produto sem tipo ou com tipo desconhecido conta como acabado', () => {
    expect(tipoDoProduto({})).toBe('acabado');
    expect(tipoDoProduto({ tipo: 'qualquer' })).toBe('acabado');
    expect(tipoDoProduto(undefined)).toBe('acabado');
  });

  it('insumo só aparece como insumo', () => {
    const insumo = { tipo: 'insumo' };
    expect(doTipo(insumo, 'insumo')).toBe(true);
    expect(doTipo(insumo, 'acabado')).toBe(false);
    expect(doTipo(insumo)).toBe(false);
  });

  it('acabado não aparece nas telas de insumo', () => {
    expect(doTipo({ tipo: 'acabado' })).toBe(true);
    expect(doTipo({ tipo: 'acabado' }, 'insumo')).toBe(false);
  });
});
