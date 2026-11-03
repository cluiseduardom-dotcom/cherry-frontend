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

import { estimarParcelamentoLink, textoEstimativaParcela } from './linkCartao';

describe('estimarParcelamentoLink', () => {
  it.each([
    [40, 2, 21.93, 43.86],
    [40, 3, 14.83, 44.49],
    [40, 6, 7.62, 45.73],
    [44, 4, 12.25, 49.0],
    [20, 4, 5.57, 22.27],
  ])('R$ %s em %sx ~ %s (total %s), como medido no Mercado Pago', (valor, n, parcela, total) => {
    const e = estimarParcelamentoLink(valor, n);
    expect(e.total).toBeCloseTo(total, 1);
    expect(Math.abs(e.valorParcela - parcela)).toBeLessThanOrEqual(0.02);
  });

  it('à vista não tem juro', () => {
    expect(estimarParcelamentoLink(40, 1)).toEqual({ parcelas: 1, valorParcela: 40, total: 40 });
  });

  it('sem fator (acima de 8x) ou entrada inválida: null', () => {
    expect(estimarParcelamentoLink(400, 9)).toBeNull();
    expect(estimarParcelamentoLink(0, 3)).toBeNull();
    expect(estimarParcelamentoLink(40, 2.5)).toBeNull();
  });
});

describe('textoEstimativaParcela', () => {
  it('formata parcela e total', () => {
    const t = textoEstimativaParcela(40, 6);
    expect(t).toContain('6x de');
    expect(t).toContain('total ≈');
  });
  it('null à vista ou sem fator', () => {
    expect(textoEstimativaParcela(40, 1)).toBeNull();
    expect(textoEstimativaParcela(400, 12)).toBeNull();
  });
});
