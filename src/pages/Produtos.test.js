import { describe, it, expect } from 'vitest';
import { temSku } from './Produtos.jsx';

describe('temSku', () => {
  it('retorna false quando sku é null — produto ainda não categorizado', () => {
    expect(temSku({ sku: null })).toBe(false);
  });

  it('retorna true quando sku já foi gerado', () => {
    expect(temSku({ sku: 'BR001' })).toBe(true);
  });
});
