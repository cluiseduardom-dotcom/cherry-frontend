import { describe, expect, test } from 'vitest';
import { formatarCobertura, ordenarPorUrgencia, selosDeReposicao } from './indicadoresInsumos';

describe('indicadoresInsumos', () => {
  test('selos: um por motivo, com rótulo e tom', () => {
    expect(selosDeReposicao({ motivos_reposicao: ['esgotado', 'pendencia'] }).map(s => [s.key, s.tom]))
      .toEqual([['esgotado', 'badge-danger'], ['pendencia', 'badge-info']]);
    expect(selosDeReposicao({ motivos_reposicao: [] })).toEqual([]);
    expect(selosDeReposicao(undefined)).toEqual([]);
  });

  test('cobertura nula vira "sem consumo"', () => {
    expect(formatarCobertura(null)).toBe('sem consumo');
    expect(formatarCobertura(210)).toBe('210 dias');
    expect(formatarCobertura(64.3)).toBe('64,3 dias');
  });

  test('ordem de urgência: esgotado, abaixo do mínimo, pendência, ok; desempate por menor cobertura', () => {
    const lista = [
      { nome: 'ok-curto', motivos_reposicao: [], cobertura_dias: 5 },
      { nome: 'pendencia', motivos_reposicao: ['pendencia'], cobertura_dias: 50 },
      { nome: 'minimo-longo', motivos_reposicao: ['abaixo_minimo'], cobertura_dias: 40 },
      { nome: 'minimo-curto', motivos_reposicao: ['abaixo_minimo'], cobertura_dias: 10 },
      { nome: 'esgotado', motivos_reposicao: ['esgotado'], cobertura_dias: 0 },
      { nome: 'ok-sem-consumo', motivos_reposicao: [], cobertura_dias: null },
    ];

    expect(ordenarPorUrgencia(lista).map(i => i.nome)).toEqual([
      'esgotado', 'minimo-curto', 'minimo-longo', 'pendencia', 'ok-curto', 'ok-sem-consumo',
    ]);
  });
});
