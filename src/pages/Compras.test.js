import { describe, it, expect } from 'vitest';
import { calcularKpisCompras, filtrarComprasPorBusca, filtrarComprasPorSubview } from './Compras.jsx';

const compras = [
  { id: 1, status: 'recebido', valor_total: '100.00', fornecedor_nome: 'Fornecedor ABC', nota_fiscal: 'NF-001' },
  { id: 2, status: 'recebido', valor_total: '50.50', fornecedor_nome: 'Joias Nobres', nota_fiscal: null },
  { id: 3, status: 'cancelado', valor_total: '200.00', fornecedor_nome: 'Gemas Brasil', nota_fiscal: 'NF-777' },
];

describe('calcularKpisCompras', () => {
  it('conta total, recebidas e canceladas a partir do status real — sem fabricar "em andamento"', () => {
    expect(calcularKpisCompras(compras)).toEqual({
      total: 3,
      recebidas: 2,
      canceladas: 1,
      valorRecebido: 150.5,
    });
  });

  it('retorna zeros para lista vazia ou inválida', () => {
    expect(calcularKpisCompras([])).toEqual({ total: 0, recebidas: 0, canceladas: 0, valorRecebido: 0 });
    expect(calcularKpisCompras(undefined)).toEqual({ total: 0, recebidas: 0, canceladas: 0, valorRecebido: 0 });
  });
});

describe('filtrarComprasPorBusca', () => {
  it('retorna a lista completa quando o termo é vazio', () => {
    expect(filtrarComprasPorBusca(compras, '')).toEqual(compras);
    expect(filtrarComprasPorBusca(compras, '   ')).toEqual(compras);
  });

  it('busca por id, aceitando o prefixo #', () => {
    expect(filtrarComprasPorBusca(compras, '#1')).toEqual([compras[0]]);
    expect(filtrarComprasPorBusca(compras, '2')).toEqual([compras[1]]);
  });

  it('busca por nome do fornecedor, case-insensitive', () => {
    expect(filtrarComprasPorBusca(compras, 'gemas')).toEqual([compras[2]]);
  });

  it('busca por número da nota fiscal', () => {
    expect(filtrarComprasPorBusca(compras, 'nf-777')).toEqual([compras[2]]);
  });

  it('não quebra quando nota_fiscal é null', () => {
    expect(filtrarComprasPorBusca(compras, 'joias')).toEqual([compras[1]]);
  });
});

describe('filtrarComprasPorSubview', () => {
  it('retorna todas as compras na subview "todas"', () => {
    expect(filtrarComprasPorSubview(compras, 'todas')).toEqual(compras);
  });

  it('filtra apenas recebidas', () => {
    expect(filtrarComprasPorSubview(compras, 'recebidas')).toEqual([compras[0], compras[1]]);
  });

  it('filtra apenas canceladas', () => {
    expect(filtrarComprasPorSubview(compras, 'canceladas')).toEqual([compras[2]]);
  });
});
