import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { buscarCondicoes, salvarCondicoes } from './lojaCondicoes';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/lojaCondicoes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca na rota das condições', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { frete_gratis_acima: 300 } });

    expect(await buscarCondicoes()).toEqual({ frete_gratis_acima: 300 });
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-condicoes');
  });

  it('salva por PUT só com os campos que o backend aceita (empresa e outros campos nunca vão)', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: {} });

    await salvarCondicoes({ frete_gratis_acima: 300, garantia_texto: null, empresa_id: 3, frete: 0 });

    const [caminho, opcoes] = api.apiFetch.mock.calls[0];
    expect(caminho).toBe('/loja-condicoes');
    expect(opcoes.method).toBe('PUT');
    expect(JSON.parse(opcoes.body)).toEqual({ frete_gratis_acima: 300, garantia_texto: null });
  });
});
