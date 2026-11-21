import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import {
  listarPedidosCompra, buscarPedidoCompra, criarPedidoCompra, atualizarPedidoCompra, enviarPedidoCompra, confirmarPedidoCompra, cancelarPedidoCompra, prepararRecebimentoDoPedido,
} from './pedidosCompra';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/pedidosCompra', () => {
  beforeEach(() => { vi.clearAllMocks(); api.apiFetch.mockResolvedValue({ data: { ok: true } }); });

  it('lista com filtros, busca, cria e edita nas rotas do contrato', async () => {
    await listarPedidosCompra({ status: 'ENVIADO', fornecedor_id: 3, page: 2 });
    await buscarPedidoCompra(9);
    await criarPedidoCompra({ fornecedor_id: 1 });
    await atualizarPedidoCompra(9, { fornecedor_id: 2 });

    expect(api.apiFetch.mock.calls[0][0]).toBe('/pedidos-compra?page=2&pageSize=50&status=ENVIADO&fornecedor_id=3');
    expect(api.apiFetch.mock.calls[1][0]).toBe('/pedidos-compra/9');
    expect(api.apiFetch.mock.calls[2]).toEqual(['/pedidos-compra', { method: 'POST', body: '{"fornecedor_id":1}' }]);
    expect(api.apiFetch.mock.calls[3]).toEqual(['/pedidos-compra/9', { method: 'PUT', body: '{"fornecedor_id":2}' }]);
  });

  it('enviar, confirmar e cancelar são POST nas ações do pedido', async () => {
    await enviarPedidoCompra(9);
    await confirmarPedidoCompra(9);
    await cancelarPedidoCompra(9);

    expect(api.apiFetch.mock.calls.map(([rota, op]) => [rota, op.method])).toEqual([
      ['/pedidos-compra/9/enviar', 'POST'], ['/pedidos-compra/9/confirmar', 'POST'], ['/pedidos-compra/9/cancelar', 'POST'],
    ]);
  });

  it('preparar o recebimento: cria, lança cada item, conferência e CONFERIDO — sem aprovar (o estoque só entra na aprovação)', async () => {
    api.apiFetch.mockResolvedValueOnce({ id: 55 }).mockResolvedValue({});
    const itens = [
      { pedido_compra_item_id: 1, produto_id: 10, descricao_snapshot: 'Anel', quantidade_recebida: 4 },
      { pedido_compra_item_id: 2, produto_id: 11, descricao_snapshot: 'Colar', quantidade_recebida: 1 },
    ];

    const recebimento = await prepararRecebimentoDoPedido({ id: 9, fornecedor_id: 3 }, { numero: 'NF 1', data_recebimento: '2026-12-01' }, itens);

    expect(recebimento.id).toBe(55);
    expect(api.apiFetch.mock.calls.map(([rota, op]) => [rota, op.method])).toEqual([
      ['/recebimentos', 'POST'], ['/recebimentos/55/itens', 'POST'], ['/recebimentos/55/itens', 'POST'],
      ['/recebimentos/55/status', 'PATCH'], ['/recebimentos/55/status', 'PATCH'],
    ]);
    expect(JSON.parse(api.apiFetch.mock.calls[0][1].body)).toEqual({ pedido_compra_id: 9, fornecedor_id: 3, numero: 'NF 1', data_recebimento: '2026-12-01' });
    expect(JSON.parse(api.apiFetch.mock.calls[1][1].body)).toEqual(itens[0]);
    expect(api.apiFetch.mock.calls.slice(3).map(([, op]) => JSON.parse(op.body).status)).toEqual(['EM_CONFERENCIA', 'CONFERIDO']);
    expect(api.apiFetch.mock.calls.some(([rota]) => rota.endsWith('/aprovar'))).toBe(false);
  });

  it('se um item falha, o erro sobe, o rascunho é cancelado e nada é aprovado', async () => {
    api.apiFetch.mockResolvedValueOnce({ id: 55 }).mockRejectedValueOnce(new Error('Quantidade recebida excede o saldo do pedido de compra')).mockResolvedValue({});

    await expect(prepararRecebimentoDoPedido({ id: 9, fornecedor_id: 3 }, { numero: 'X', data_recebimento: '2026-12-01' }, [{ pedido_compra_item_id: 1, quantidade_recebida: 99 }])).rejects.toThrow('excede o saldo');
    expect(api.apiFetch).toHaveBeenCalledTimes(3);
    expect(api.apiFetch.mock.calls[2][0]).toBe('/recebimentos/55/status');
    expect(JSON.parse(api.apiFetch.mock.calls[2][1].body)).toEqual({ status: 'CANCELADO' });
    expect(api.apiFetch.mock.calls.some(([rota]) => rota.endsWith('/aprovar'))).toBe(false);
  });

  it('se o cancelamento também falha, ainda devolve o erro original', async () => {
    api.apiFetch.mockResolvedValueOnce({ id: 55 }).mockRejectedValueOnce(new Error('erro original')).mockRejectedValueOnce(new Error('falha ao cancelar'));

    await expect(prepararRecebimentoDoPedido({ id: 9, fornecedor_id: 3 }, { numero: 'X', data_recebimento: '2026-12-01' }, [{ pedido_compra_item_id: 1, quantidade_recebida: 1 }])).rejects.toThrow('erro original');
  });
});
