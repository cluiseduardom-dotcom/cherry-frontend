import { describe, it, expect } from 'vitest';
import { normalizarCodigoLido } from './BarcodeScannerModal.jsx';

describe('normalizarCodigoLido', () => {
  it('remove espaços nas pontas', () => {
    expect(normalizarCodigoLido('  7891234567895  ')).toBe('7891234567895');
  });

  it('retorna string vazia para valores ausentes', () => {
    expect(normalizarCodigoLido(null)).toBe('');
    expect(normalizarCodigoLido(undefined)).toBe('');
  });

  it('converte valores não-string para texto', () => {
    expect(normalizarCodigoLido(7891234567895)).toBe('7891234567895');
  });
});
