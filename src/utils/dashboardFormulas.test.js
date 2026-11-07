import { describe, expect, test } from 'vitest';
import { indicadoresDeTotais, calcularCobertura, calcularGiro, classificarCurva, simularCurvaAbc } from './dashboardFormulas';

describe('dashboardFormulas', () => {
  test('giro = vendido / estoque, 2 casas; nulo com estoque 0', () => {
    expect(calcularGiro(30, 12)).toBe(2.5);
    expect(calcularGiro(10, 3)).toBe(3.33);
    expect(calcularGiro(5, 0)).toBeNull();
  });

  test('cobertura = estoque / (vendido / dias), 1 casa; nula sem venda', () => {
    expect(calcularCobertura(30, 12, 90)).toBe(36);
    expect(calcularCobertura(7, 5, 90)).toBe(64.3);
    expect(calcularCobertura(0, 5, 90)).toBeNull();
  });

  test('curva: pelo acumulado antes do produto; < 80% = A, < 95% = B, resto = C; total zero = C', () => {
    expect(classificarCurva(0, 100)).toBe('A');
    expect(classificarCurva(79.99, 100)).toBe('A');
    expect(classificarCurva(80, 100)).toBe('B');
    expect(classificarCurva(94.99, 100)).toBe('B');
    expect(classificarCurva(95, 100)).toBe('C');
    expect(classificarCurva(0, 0)).toBe('C');
  });

  test('simulação: o produto que cruza 80% fica na A; acumulado exato de 80% fecha a A', () => {
    const r = simularCurvaAbc([5000, 3000, 1000, 600, 400]);
    expect(r.map(x => x.curva)).toEqual(['A', 'A', 'B', 'B', 'C']);
    expect(r.map(x => x.percentual)).toEqual([50, 80, 90, 96, 100]);
    expect(simularCurvaAbc([900, 60, 40]).map(x => x.curva)).toEqual(['A', 'B', 'C']);
    expect(simularCurvaAbc([100]).map(x => x.curva)).toEqual(['A']);
  });

  test('indicadoresDeTotais usa os totais do backend e tolera ausência', () => {
    expect(indicadoresDeTotais({ giro: 0.2, cobertura: 450.4 })).toEqual({ giroMedio: '0.20', coberturaMedia: 450 });
    expect(indicadoresDeTotais({ giro: null, cobertura: null })).toEqual({ giroMedio: null, coberturaMedia: null });
    expect(indicadoresDeTotais(undefined)).toEqual({ giroMedio: null, coberturaMedia: null });
  });
});
