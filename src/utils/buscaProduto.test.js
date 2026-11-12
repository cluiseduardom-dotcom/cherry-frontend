import { describe, it, expect } from 'vitest';
import { buscarProdutos, moverDestaque, normalizar, rotuloDoProduto, LIMITE_RESULTADOS } from './buscaProduto';

const P = [
  { id: 1, nome: 'Anel solitário regulável zircônia banhado a ouro', sku: 'ANE-BO-FEM-001', estoque_atual: 2 },
  { id: 2, nome: 'Brinco Esfera Dourada com Cristal', sku: 'BRC-BO-FEM-002', estoque_atual: 1 },
  { id: 3, nome: 'Pingente borboleta madrepérola dourado', sku: 'PIN-BO-FEM-001', estoque_atual: 1 },
  { id: 4, nome: 'Anel prisma ajustável zircônia ródio', sku: 'ANE-BR-FEM-001', codigo_barras: '7891234567890', estoque_atual: 0 },
];
const ids = (r) => r.itens.map((p) => p.id);

describe('normalizar', () => {
  it('ignora acento, maiúsculas e espaços repetidos', () => {
    expect(normalizar('  ZIRCÔNIA   Ródio ')).toBe('zirconia rodio');
    expect(normalizar(null)).toBe('');
  });
});

describe('buscarProdutos', () => {
  it('sem texto, lista por nome (limitada) e informa o total', () => {
    const r = buscarProdutos(P, '');
    expect(r.total).toBe(4);
    expect(ids(r)).toEqual([4, 1, 2, 3]);
  });

  it('acha sem acento e em qualquer parte do nome', () => {
    expect(ids(buscarProdutos(P, 'zirconia'))).toEqual([4, 1]);
    expect(ids(buscarProdutos(P, 'BORBOLETA'))).toEqual([3]);
  });

  it('várias palavras: todas precisam bater, em qualquer ordem', () => {
    expect(ids(buscarProdutos(P, 'anel rodio'))).toEqual([4]);
    expect(ids(buscarProdutos(P, 'rodio anel'))).toEqual([4]);
    expect(ids(buscarProdutos(P, 'anel brinco'))).toEqual([]);
  });

  it('acha por código (SKU e código de barras), com o código exato primeiro', () => {
    expect(ids(buscarProdutos(P, 'ane-br-fem-001'))).toEqual([4]);
    expect(ids(buscarProdutos(P, '7891234567890'))).toEqual([4]);
    expect(ids(buscarProdutos(P, 'FEM-001'))).toEqual([4, 1, 3]);
  });

  it('o que começa com o digitado vem antes do que só contém', () => {
    const lista = [
      { id: 10, nome: 'Colar de anel', sku: 'A' },
      { id: 11, nome: 'Anel simples', sku: 'B' },
    ];
    expect(ids(buscarProdutos(lista, 'anel'))).toEqual([11, 10]);
  });

  it('a frase digitada inteira vem antes de acertos soltos, e números seguem ordem natural', () => {
    const lista = [
      { id: 1, nome: 'Brinco modelo 125', sku: 'B-125' },
      { id: 2, nome: 'Brinco modelo 25', sku: 'B-25' },
      { id: 3, nome: 'Brinco modelo 250', sku: 'B-250' },
      { id: 4, nome: 'Brinco 25 modelo', sku: 'B-X' },
    ];
    expect(ids(buscarProdutos(lista, 'modelo 25'))).toEqual([2, 3, 4, 1]);
    expect(ids(buscarProdutos(lista, 'brinco'))).toEqual([4, 2, 1, 3]);
  });

  it('limita os resultados mas informa quantos combinam', () => {
    const muitos = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1, nome: `Anel ${String(i).padStart(4, '0')}`, sku: `ANE-${i}` }));
    const r = buscarProdutos(muitos, 'anel');
    expect(r.itens).toHaveLength(LIMITE_RESULTADOS);
    expect(r.total).toBe(1000);
    expect(ids(buscarProdutos(muitos, 'anel 0999'))).toEqual([1000]);
  });

  it('lista inválida não quebra', () => {
    expect(buscarProdutos(undefined, 'x')).toEqual({ itens: [], total: 0 });
  });
});

describe('rotuloDoProduto e moverDestaque', () => {
  it('rótulo com SKU quando existe', () => {
    expect(rotuloDoProduto(P[0])).toBe('Anel solitário regulável zircônia banhado a ouro (ANE-BO-FEM-001)');
    expect(rotuloDoProduto({ nome: 'X' })).toBe('X');
    expect(rotuloDoProduto(null)).toBe('');
  });

  it('as setas dão a volta e lista vazia não tem destaque', () => {
    expect(moverDestaque(-1, 3, 1)).toBe(0);
    expect(moverDestaque(-1, 3, -1)).toBe(2);
    expect(moverDestaque(2, 3, 1)).toBe(0);
    expect(moverDestaque(0, 3, -1)).toBe(2);
    expect(moverDestaque(0, 0, 1)).toBe(-1);
  });
});
