import { describe, it, expect } from 'vitest';
import { mesValido, mesAtualBrasilia, deslocarMes, rotuloMes, formatarPercentuais } from './plataforma';

describe('mesValido', () => {
  it('aceita AAAA-MM e recusa o resto', () => {
    expect(mesValido('2026-10')).toBe(true);
    expect(mesValido('2026-13')).toBe(false);
    expect(mesValido('2026-1')).toBe(false);
    expect(mesValido('')).toBe(false);
    expect(mesValido(undefined)).toBe(false);
  });
});

describe('mesAtualBrasilia', () => {
  it('usa o fuso de Brasília na virada do mês', () => {
    // 01/11 02:00 UTC ainda é 31/10 23:00 em Brasília
    expect(mesAtualBrasilia(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10');
    expect(mesAtualBrasilia(new Date('2026-11-01T03:00:00Z'))).toBe('2026-11');
  });
});

describe('deslocarMes', () => {
  it('anda para frente e para trás atravessando o ano', () => {
    expect(deslocarMes('2026-10', -1)).toBe('2026-09');
    expect(deslocarMes('2026-01', -1)).toBe('2025-12');
    expect(deslocarMes('2026-12', 1)).toBe('2027-01');
    expect(deslocarMes('2026-10', 0)).toBe('2026-10');
  });
  it('devolve a entrada se ela for inválida', () => {
    expect(deslocarMes('xx', 1)).toBe('xx');
  });
});

describe('rotuloMes', () => {
  it('escreve o mês por extenso', () => {
    expect(rotuloMes('2026-03')).toBe('Março de 2026');
    expect(rotuloMes('2026-10')).toBe('Outubro de 2026');
    expect(rotuloMes('lixo')).toBe('');
  });
});

describe('formatarPercentuais', () => {
  it('formata um, vários e nenhum', () => {
    expect(formatarPercentuais([0.15])).toBe('0,15%');
    expect(formatarPercentuais([0.1, 0.15])).toBe('0,10% e 0,15%');
    expect(formatarPercentuais([0.05, 0.1, 0.15])).toBe('0,05%, 0,10% e 0,15%');
    expect(formatarPercentuais([])).toBe('—');
    expect(formatarPercentuais(undefined)).toBe('—');
  });
});
