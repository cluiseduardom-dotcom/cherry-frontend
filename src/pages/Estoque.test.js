import { describe, it, expect } from 'vitest';
import { normalizarFiltro } from './Estoque.jsx';

describe('normalizarFiltro', () => {
  it('aceita os filtros válidos', () => {
    expect(normalizarFiltro('todos')).toBe('todos');
    expect(normalizarFiltro('baixo')).toBe('baixo');
    expect(normalizarFiltro('esgotado')).toBe('esgotado');
  });

  it('cai em "todos" quando o parâmetro está ausente', () => {
    expect(normalizarFiltro(null)).toBe('todos');
    expect(normalizarFiltro(undefined)).toBe('todos');
  });

  it('cai em "todos" para qualquer valor desconhecido/inválido — não quebra a tela nem exige tratamento de erro visível', () => {
    expect(normalizarFiltro('qualquer-coisa')).toBe('todos');
    expect(normalizarFiltro('')).toBe('todos');
    expect(normalizarFiltro('BAIXO')).toBe('todos');
  });
});
