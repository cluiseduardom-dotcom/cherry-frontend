import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { buscarHomeVendas, salvarHomeVendas } from './lojaHomeVendas';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/lojaHomeVendas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca na rota da seção', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { home_vendas_ativo: false } });

    expect(await buscarHomeVendas()).toEqual({ home_vendas_ativo: false });
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-home-vendas');
  });

  it('salva por PUT só com os campos que o backend aceita (empresa e outros campos nunca vão)', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: {} });

    await salvarHomeVendas({ home_vendas_ativo: true, home_ajuda_titulo: null, empresa_id: 3, preco: 1, historia: 'x' });

    const [caminho, opcoes] = api.apiFetch.mock.calls[0];
    expect(caminho).toBe('/loja-home-vendas');
    expect(opcoes.method).toBe('PUT');
    expect(JSON.parse(opcoes.body)).toEqual({ home_vendas_ativo: true, home_ajuda_titulo: null });
  });
});
