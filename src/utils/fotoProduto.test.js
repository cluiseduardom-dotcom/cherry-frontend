import { describe, expect, it } from 'vitest';
import {
  MAX_BYTES_ORIGINAL, MAX_FOTOS, calcularDimensoes, definirPrincipal, moverFoto, podeAdicionarFoto, validarArquivoFoto,
} from './fotoProduto';

describe('validarArquivoFoto', () => {
  it('aceita JPEG, PNG e WebP', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validarArquivoFoto({ type, size: 1000 })).toBe('');
    }
  });

  it('recusa outro formato, arquivo grande demais e ausência de arquivo', () => {
    expect(validarArquivoFoto({ type: 'image/gif', size: 10 })).toMatch(/Formato inválido/);
    expect(validarArquivoFoto({ type: 'image/svg+xml', size: 10 })).toMatch(/Formato inválido/);
    expect(validarArquivoFoto({ type: 'image/jpeg', size: MAX_BYTES_ORIGINAL + 1 })).toMatch(/grande demais/);
    expect(validarArquivoFoto(null)).toMatch(/Selecione/);
  });
});

describe('calcularDimensoes', () => {
  it('reduz pelo maior lado mantendo a proporção', () => {
    expect(calcularDimensoes(4000, 3000)).toEqual({ largura: 1000, altura: 750 });
    expect(calcularDimensoes(3000, 4000)).toEqual({ largura: 750, altura: 1000 });
  });

  it('não amplia foto menor que o limite', () => {
    expect(calcularDimensoes(800, 600)).toEqual({ largura: 800, altura: 600 });
    expect(calcularDimensoes(1000, 1000)).toEqual({ largura: 1000, altura: 1000 });
  });

  it('proporção extrema nunca zera um dos lados; entrada inválida devolve 0', () => {
    expect(calcularDimensoes(10000, 5)).toEqual({ largura: 1000, altura: 1 });
    expect(calcularDimensoes(0, 100)).toEqual({ largura: 0, altura: 0 });
    expect(calcularDimensoes(undefined, 100)).toEqual({ largura: 0, altura: 0 });
  });
});

describe('ordem das fotos', () => {
  it('moverFoto troca com o vizinho e respeita os limites', () => {
    expect(moverFoto([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
    expect(moverFoto([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
    expect(moverFoto([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moverFoto([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
    expect(moverFoto([1, 2, 3], 5, -1)).toEqual([1, 2, 3]);
  });

  it('moverFoto não altera a lista original', () => {
    const ids = [1, 2, 3];
    moverFoto(ids, 0, 1);
    expect(ids).toEqual([1, 2, 3]);
  });

  it('definirPrincipal põe a escolhida na frente e mantém as demais em ordem', () => {
    expect(definirPrincipal([1, 2, 3, 4], 3)).toEqual([3, 1, 2, 4]);
    expect(definirPrincipal([1, 2, 3], 1)).toEqual([1, 2, 3]);
    expect(definirPrincipal([1, 2, 3], 99)).toEqual([1, 2, 3]);
  });

  it('limite de fotos', () => {
    expect(MAX_FOTOS).toBe(5);
    expect(podeAdicionarFoto(4)).toBe(true);
    expect(podeAdicionarFoto(5)).toBe(false);
  });
});
