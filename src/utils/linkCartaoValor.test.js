import { describe, it, expect } from 'vitest';
import { parcelasPossiveisLink, textoParcelasLink } from './linkCartao';

describe('parcelasPossiveisLink', () => {
  it.each([
    [20, 6, 4],
    [40, 6, 6],
    [25, 6, 5],
    [24.99, 6, 4],
    [4.99, 6, 1],
    [221, 6, 6],
    [221, 12, 12],
    [221, undefined, 12],
    [0, 6, 1],
    [NaN, 6, 1],
  ])('valor %s com teto %s -> %s', (valor, teto, esperado) => {
    expect(parcelasPossiveisLink(valor, teto)).toBe(esperado);
  });

  it('teto inválido cai no padrão', () => {
    expect(parcelasPossiveisLink(500, 0)).toBe(12);
    expect(parcelasPossiveisLink(500, 2.5)).toBe(12);
  });
});

describe('textoParcelasLink', () => {
  it('à vista quando só cabe 1x', () => {
    expect(textoParcelasLink(1)).toContain('à vista');
  });
  it('anuncia o teto e que o cliente escolhe no Mercado Pago', () => {
    const t = textoParcelasLink(4);
    expect(t).toContain('até 4x');
    expect(t).toContain('página do Mercado Pago');
    expect(t).toContain('juro');
  });
});
