import { describe, it, expect } from 'vitest';
import { ehEmail, gerarLoginBase, loginValido, normalizarLogin } from './loginUsuario';

describe('gerarLoginBase (mesma regra do backend)', () => {
  it.each([
    ['Luís Eduardo Martins Cardoso', 'LEMCAR'],
    ['Emilly Graziela Alves da Silva', 'EGASIL'],
    ['Emilly Graziella Alves da Silva', 'EGASIL'],
    ['Luís Eduardo Cardoso', 'LECAR'],
    ['Ana dos Santos', 'ASAN'],
    ['Eduardo', 'EDUARD'],
    ['', ''],
  ])('%s → %s', (nome, esperado) => {
    expect(gerarLoginBase(nome)).toBe(esperado);
  });
});

describe('normalizarLogin / loginValido / ehEmail', () => {
  it('normaliza e valida', () => {
    expect(normalizarLogin(' lécar ')).toBe('LECAR');
    expect(loginValido('LECAR')).toBe(true);
    expect(loginValido('L')).toBe(false);
  });
  it('separa e-mail de código', () => {
    expect(ehEmail('a@b.com')).toBe(true);
    expect(ehEmail('EGASIL')).toBe(false);
  });
});
