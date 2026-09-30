import { describe, it, expect } from 'vitest';
import { agruparHistoricoPorVenda } from './agruparHistoricoPorVenda';

describe('agruparHistoricoPorVenda', () => {
  it('agrupa 1 venda com 1 item', () => {
    const registros = [
      { venda_id: 1, data: '2026-07-22', produto: 'Colar', quantidade: 1, preco_unitario: 119.6, total_item: 119.6 },
    ];
    const resultado = agruparHistoricoPorVenda(registros);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({ venda_id: 1, quantidadeItens: 1, totalVenda: 119.6 });
    expect(resultado[0].itens).toHaveLength(1);
  });

  it('agrupa 1 venda com vários itens, somando o total quando total_venda não vem do backend', () => {
    const registros = [
      { venda_id: 1, data: '2026-07-22', produto: 'Colar', quantidade: 1, preco_unitario: 89.7, total_item: 89.7 },
      { venda_id: 1, data: '2026-07-22', produto: 'Brinco', quantidade: 1, preco_unitario: 40, total_item: 40 },
    ];
    const resultado = agruparHistoricoPorVenda(registros);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidadeItens).toBe(2);
    expect(resultado[0].totalVenda).toBe(129.7);
  });

  it('agrupa várias vendas com vários itens cada, mantendo a ordem de chegada', () => {
    const registros = [
      { venda_id: 5, data: '2026-08-31', produto: 'Pulseira', quantidade: 1, preco_unitario: 119.6, total_item: 119.6 },
      { venda_id: 1, data: '2026-07-22', produto: 'Colar', quantidade: 1, preco_unitario: 89.7, total_item: 89.7 },
      { venda_id: 1, data: '2026-07-22', produto: 'Brinco', quantidade: 1, preco_unitario: 40, total_item: 40 },
    ];
    const resultado = agruparHistoricoPorVenda(registros);
    expect(resultado.map(v => v.venda_id)).toEqual([5, 1]);
    expect(resultado[0].quantidadeItens).toBe(1);
    expect(resultado[1].quantidadeItens).toBe(2);
    expect(resultado[1].totalVenda).toBe(129.7);
  });

  it('usa total_venda do backend quando presente, em vez de somar os itens', () => {
    const registros = [
      { venda_id: 1, data: '2026-07-22', total_venda: 100, produto: 'Colar', quantidade: 1, preco_unitario: 89.7, total_item: 89.7 },
      { venda_id: 1, data: '2026-07-22', total_venda: 100, produto: 'Brinco', quantidade: 1, preco_unitario: 40, total_item: 40 },
    ];
    const resultado = agruparHistoricoPorVenda(registros);
    // total_venda (100) prevalece sobre a soma dos itens (129.7) — reflete
    // desconto/juros que o histórico de itens não carrega.
    expect(resultado[0].totalVenda).toBe(100);
  });

  it('não quebra com lista vazia ou inválida', () => {
    expect(agruparHistoricoPorVenda([])).toEqual([]);
    expect(agruparHistoricoPorVenda(undefined)).toEqual([]);
    expect(agruparHistoricoPorVenda(null)).toEqual([]);
  });
});
