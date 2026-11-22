import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { listarCotacoes, buscarCotacao, criarCotacao, registrarProposta, recusarFornecedor, cancelarCotacao, gerarPedidos } from './cotacoes';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/cotacoes', () => {
  beforeEach(() => { vi.clearAllMocks(); api.apiFetch.mockResolvedValue({ data: { ok: true } }); });

  it('lista com filtro, busca e cria nas rotas do contrato', async () => {
    await listarCotacoes({ status: 'ABERTA', page: 2 });
    await buscarCotacao(7);
    await criarCotacao({ fornecedor_ids: [1] });

    expect(api.apiFetch.mock.calls[0][0]).toBe('/cotacoes?page=2&pageSize=50&status=ABERTA');
    expect(api.apiFetch.mock.calls[1][0]).toBe('/cotacoes/7');
    expect(api.apiFetch.mock.calls[2]).toEqual(['/cotacoes', { method: 'POST', body: '{"fornecedor_ids":[1]}' }]);
  });

  it('proposta é PUT (troca a anterior); recusar, cancelar e gerar pedidos são POST', async () => {
    await registrarProposta(7, 3, [{ cotacao_item_id: 1, preco_unitario: 5 }]);
    await recusarFornecedor(7, 3);
    await cancelarCotacao(7);
    await gerarPedidos(7, [{ cotacao_item_id: 1, fornecedor_id: 3 }]);

    expect(api.apiFetch.mock.calls.map(([rota, op]) => [rota, op.method])).toEqual([
      ['/cotacoes/7/fornecedores/3/oferta', 'PUT'], ['/cotacoes/7/fornecedores/3/recusar', 'POST'], ['/cotacoes/7/cancelar', 'POST'], ['/cotacoes/7/gerar-pedidos', 'POST'],
    ]);
    expect(JSON.parse(api.apiFetch.mock.calls[0][1].body)).toEqual({ itens: [{ cotacao_item_id: 1, preco_unitario: 5 }] });
    expect(JSON.parse(api.apiFetch.mock.calls[3][1].body)).toEqual({ escolhas: [{ cotacao_item_id: 1, fornecedor_id: 3 }] });
  });
});
