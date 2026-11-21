import { describe, it, expect } from 'vitest';
import {
  acoesDoPedido, badgeStatusPedido, formDoPedido, formVazio, itensARecever, montarCorpoPedido, montarItensRecebimento,
  rotuloStatusPedido, totalDoItem, totalDoPedido, validarPedidoForm,
} from './pedidoCompra';

const formValido = () => ({
  ...formVazio(),
  fornecedor_id: '7',
  itens: [{ produto_id: '1', quantidade: 10, preco_unitario: '12.5', desconto: '' }, { produto_id: '2', quantidade: 4, preco_unitario: '30', desconto: '8' }],
  frete_valor: '10',
  desconto: '5',
});

describe('totais (mesma conta do backend)', () => {
  it('item: qtd × preço − desconto, em centavos', () => {
    expect(totalDoItem({ quantidade: 4, preco_unitario: '30', desconto: '8' })).toBe(112);
    expect(totalDoItem({ quantidade: 3, preco_unitario: '0.1', desconto: '' })).toBe(0.3); // sem erro de ponto flutuante
    expect(totalDoItem({ quantidade: 1, preco_unitario: '1', desconto: '5' })).toBe(0);
  });

  it('pedido: itens − desconto + frete + outras despesas, nunca negativo', () => {
    expect(totalDoPedido(formValido())).toBe(242);
    expect(totalDoPedido({ ...formValido(), outras_despesas: '3.5' })).toBe(245.5);
    expect(totalDoPedido({ ...formVazio(), desconto: '50' })).toBe(0);
  });
});

describe('validarPedidoForm', () => {
  it('aceita o pedido completo', () => {
    expect(validarPedidoForm(formValido())).toBeNull();
  });

  it.each([
    [{ fornecedor_id: '' }, 'fornecedor'],
    [{ itens: [] }, 'ao menos um item'],
    [{ itens: [{ produto_id: '', quantidade: 1, preco_unitario: '1', desconto: '' }] }, 'escolha o produto'],
    [{ itens: [{ produto_id: '1', quantidade: 1.5, preco_unitario: '1', desconto: '' }] }, 'inteiro'],
    [{ itens: [{ produto_id: '1', quantidade: 0, preco_unitario: '1', desconto: '' }] }, 'inteiro'],
    [{ itens: [{ produto_id: '1', quantidade: 1, preco_unitario: '', desconto: '' }] }, 'preço'],
    [{ itens: [{ produto_id: '1', quantidade: 1, preco_unitario: '1', desconto: '5' }] }, 'desconto'],
    [{ frete_valor: '-1' }, 'frete'],
    [{ prazo_pagamento_dias: '400' }, 'prazo'],
    [{ prazo_pagamento_dias: '1.5' }, 'prazo'],
  ])('recusa %j', (extra, trecho) => {
    expect(validarPedidoForm({ ...formValido(), ...extra }).toLowerCase()).toContain(trecho);
  });
});

describe('montarCorpoPedido', () => {
  it('converte para números e só envia o que foi preenchido', () => {
    expect(montarCorpoPedido({ ...formVazio(), fornecedor_id: '7', itens: [{ produto_id: '1', quantidade: '2', preco_unitario: '5', desconto: '' }] }))
      .toEqual({ fornecedor_id: 7, itens: [{ produto_id: 1, quantidade: 2, preco_unitario: 5 }] });

    expect(montarCorpoPedido({ ...formValido(), prazo_pagamento_dias: '30', data_prevista_entrega: '2026-12-10', observacoes: ' urgente ' })).toEqual({
      fornecedor_id: 7,
      itens: [{ produto_id: 1, quantidade: 10, preco_unitario: 12.5 }, { produto_id: 2, quantidade: 4, preco_unitario: 30, desconto: 8 }],
      prazo_pagamento_dias: 30, data_prevista_entrega: '2026-12-10', frete_valor: 10, desconto: 5, observacoes: 'urgente',
    });
  });

  it('prazo 0 é enviado (à vista); nunca vai empresa_id, status ou total', () => {
    const corpo = montarCorpoPedido({ ...formValido(), prazo_pagamento_dias: '0' });

    expect(corpo.prazo_pagamento_dias).toBe(0);
    expect(Object.keys(corpo)).not.toEqual(expect.arrayContaining(['empresa_id', 'status', 'total']));
  });
});

describe('formDoPedido (editar o rascunho)', () => {
  it('volta o pedido do backend para o formulário, sem zeros soltos', () => {
    const form = formDoPedido({
      fornecedor_id: 7, prazo_pagamento_dias: 30, frete_valor: 10, desconto: 0, outras_despesas: 0, observacoes: null, data_prevista_entrega: '2026-12-10', forma_pagamento: null,
      itens: [{ produto_id: 1, quantidade: 10, preco_unitario: 12.5, desconto: 0 }],
    });

    expect(form).toMatchObject({ fornecedor_id: '7', prazo_pagamento_dias: '30', frete_valor: '10', desconto: '', observacoes: '', data_prevista_entrega: '2026-12-10' });
    expect(form.itens).toEqual([{ produto_id: '1', quantidade: 10, preco_unitario: 12.5, desconto: '' }]);
    expect(validarPedidoForm(form)).toBeNull();
  });
});

describe('status e ações', () => {
  it('rótulos em linguagem do dia a dia', () => {
    expect(rotuloStatusPedido('ENVIADO')).toBe('Enviado ao fornecedor');
    expect(rotuloStatusPedido('XYZ')).toBe('XYZ');
    expect(badgeStatusPedido('RECEBIDO')).toBe('badge badge-success');
    expect(badgeStatusPedido('CANCELADO')).toBe('badge badge-danger');
  });

  it('cada status libera só o que o backend aceita', () => {
    expect(acoesDoPedido('RASCUNHO')).toEqual({ editar: true, enviar: true, confirmar: false, cancelar: true, receber: false });
    expect(acoesDoPedido('ENVIADO')).toEqual({ editar: false, enviar: false, confirmar: true, cancelar: true, receber: true });
    expect(acoesDoPedido('CONFIRMADO')).toEqual({ editar: false, enviar: false, confirmar: false, cancelar: true, receber: true });
    expect(acoesDoPedido('PARCIALMENTE_RECEBIDO')).toEqual({ editar: false, enviar: false, confirmar: false, cancelar: false, receber: true });
    expect(acoesDoPedido('RECEBIDO')).toEqual({ editar: false, enviar: false, confirmar: false, cancelar: false, receber: false });
    expect(acoesDoPedido('CANCELADO')).toEqual({ editar: false, enviar: false, confirmar: false, cancelar: false, receber: false });
  });
});

describe('receber o pedido', () => {
  const pedido = {
    itens: [
      { id: 1, produto_id: 10, descricao_snapshot: 'Anel', saldo: 6 },
      { id: 2, produto_id: 11, descricao_snapshot: 'Colar', saldo: 0 },
      { id: 3, produto_id: 12, descricao_snapshot: 'Brinco', saldo: 2 },
    ],
  };

  it('só itens com saldo, propondo receber o saldo inteiro', () => {
    expect(itensARecever(pedido).map((i) => [i.id, i.quantidade_a_receber])).toEqual([[1, 6], [3, 2]]);
  });

  it('sem digitar nada recebe tudo; zero ou vazio pula o item', () => {
    const itens = itensARecever(pedido);

    expect(montarItensRecebimento(itens, {}).itens).toEqual([
      { pedido_compra_item_id: 1, produto_id: 10, descricao_snapshot: 'Anel', quantidade_recebida: 6 },
      { pedido_compra_item_id: 3, produto_id: 12, descricao_snapshot: 'Brinco', quantidade_recebida: 2 },
    ]);
    expect(montarItensRecebimento(itens, { 1: '4', 3: '0' }).itens.map((i) => i.quantidade_recebida)).toEqual([4]);
  });

  it('recusa mais que o saldo, decimal, negativo e recebimento vazio', () => {
    const itens = itensARecever(pedido);

    expect(montarItensRecebimento(itens, { 1: '7' }).erro).toContain('faltam só 6');
    expect(montarItensRecebimento(itens, { 1: '1.5' }).erro).toContain('inteiro');
    expect(montarItensRecebimento(itens, { 1: '-1' }).erro).toContain('inteiro');
    expect(montarItensRecebimento(itens, { 1: '0', 3: '' }).erro).toContain('ao menos um item');
  });
});
