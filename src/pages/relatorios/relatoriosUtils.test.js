import { describe, expect, it } from 'vitest';
import { dayOfMonthLabel, weekdayLabel } from './relatoriosUtils';

describe('rótulos do gráfico de receita por dia', () => {
  it('mostra o número do dia do mês sem zero à esquerda', () => {
    expect(dayOfMonthLabel('2026-10-21')).toBe('21');
    expect(dayOfMonthLabel('2026-10-05')).toBe('5');
    expect(dayOfMonthLabel('2026-11-01')).toBe('1');
  });

  it('não desloca o dia por fuso (data ISO é tratada como local)', () => {
    expect(dayOfMonthLabel('2026-12-31')).toBe('31');
    expect(dayOfMonthLabel('2026-03-01T00:00:00.000Z')).toBe('1');
  });

  it('o dia da semana continua correspondendo à mesma data', () => {
    expect(weekdayLabel('2026-10-21')).toBe('Qua');
  });
});
