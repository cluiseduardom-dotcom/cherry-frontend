import { describe, it, expect } from 'vitest';
import { mensagemDeConfirmacao, modeloPorId, podeOferecerModelos, totalDeCategorias } from './modelosNicho';

const modelo = {
  id: 'confeitaria',
  nome: 'Confeitaria e doces',
  exemplo_sku: 'BOL-P-001',
  niveis: [
    { nivel: 1, nome: 'Tipo', categorias: [{ codigo: 'BOL', nome: 'Bolos' }, { codigo: 'TOR', nome: 'Tortas' }] },
    { nivel: 2, nome: 'Tamanho', categorias: [{ codigo: 'P', nome: 'Pequeno' }] },
  ],
};

describe('modelos de nicho', () => {
  it('conta as categorias de todos os níveis', () => {
    expect(totalDeCategorias(modelo)).toBe(3);
    expect(totalDeCategorias(null)).toBe(0);
    expect(totalDeCategorias({ niveis: [] })).toBe(0);
  });

  it('a confirmação diz o que será criado e que dá para editar depois', () => {
    const texto = mensagemDeConfirmacao(modelo);
    expect(texto).toContain('3 categorias em 2 níveis');
    expect(texto).toContain('Tipo e Tamanho');
    expect(texto).toContain('BOL-P-001');
    expect(texto).toMatch(/editar|renomear/);
    expect(mensagemDeConfirmacao(null)).toBe('');
  });

  it('só oferece modelo para produto, e só sem nenhuma categoria', () => {
    expect(podeOferecerModelos({ ehInsumo: false, totalCategorias: 0 })).toBe(true);
    expect(podeOferecerModelos({ ehInsumo: false, totalCategorias: 3 })).toBe(false);
    expect(podeOferecerModelos({ ehInsumo: true, totalCategorias: 0 })).toBe(false);
  });

  it('acha por id', () => {
    expect(modeloPorId([modelo], 'confeitaria')).toBe(modelo);
    expect(modeloPorId([modelo], 'x')).toBeNull();
    expect(modeloPorId(null, 'x')).toBeNull();
  });
});
