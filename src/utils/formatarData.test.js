import { describe, it, expect } from 'vitest';
import { formatarData } from './formatarData';

describe('formatarData', () => {
  it('formata uma data DATE do Postgres (string simples YYYY-MM-DD) como DD/MM/YYYY', () => {
    expect(formatarData('2026-09-25')).toBe('25/09/2026');
  });

  it('formata um timestamp ISO completo usando só a parte da data', () => {
    expect(formatarData('2026-09-25T10:30:00.000Z')).toBe('25/09/2026');
  });

  it('retorna "Não informada" para valores ausentes', () => {
    expect(formatarData(null)).toBe('Não informada');
    expect(formatarData(undefined)).toBe('Não informada');
    expect(formatarData('')).toBe('Não informada');
  });

  it('retorna "Não informada" em vez de "Invalid Date" para formato inesperado', () => {
    expect(formatarData('não é uma data')).toBe('Não informada');
    expect(formatarData('2026-13-99')).toBe('Não informada');
  });
});
