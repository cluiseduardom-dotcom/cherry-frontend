import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { listarPedidosLoja, marcarEntregaCombinada } from './pedidosLoja';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/pedidosLoja', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista a fila "a combinar" por padrão, com página e limite', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { itens: [{ codigo: 'x' }], total: 1 } });

    expect(await listarPedidosLoja()).toEqual({ itens: [{ codigo: 'x' }], total: 1 });
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-pedidos?situacao=a_combinar&pagina=1&limite=20');
  });

  it('lista outra situação e outra página', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { itens: [], total: 0 } });

    await listarPedidosLoja({ situacao: 'combinadas', pagina: 3, limite: 10 });

    expect(api.apiFetch).toHaveBeenCalledWith('/loja-pedidos?situacao=combinadas&pagina=3&limite=10');
  });

  it('marca a entrega por POST no código do pedido, só com a observação quando há', async () => {
    api.apiFetch.mockResolvedValue({ data: { codigo: 'abc' } });

    await marcarEntregaCombinada('11111111-1111-4111-8111-111111111111', '  Retira na loja ');
    await marcarEntregaCombinada('22222222-2222-4222-8222-222222222222', '   ');
    await marcarEntregaCombinada('33333333-3333-4333-8333-333333333333');

    const [primeira, segunda, terceira] = api.apiFetch.mock.calls;
    expect(primeira[0]).toBe('/loja-pedidos/11111111-1111-4111-8111-111111111111/entrega-combinada');
    expect(primeira[1]).toEqual({ method: 'POST', body: JSON.stringify({ observacao: 'Retira na loja' }) });
    expect(segunda[1].body).toBe('{}');
    expect(terceira[1].body).toBe('{}');
  });

  it('o código vai codificado na URL (nunca quebra o caminho)', async () => {
    api.apiFetch.mockResolvedValue({ data: {} });

    await marcarEntregaCombinada('a/b?c', '');

    expect(api.apiFetch.mock.calls[0][0]).toBe('/loja-pedidos/a%2Fb%3Fc/entrega-combinada');
  });
});
