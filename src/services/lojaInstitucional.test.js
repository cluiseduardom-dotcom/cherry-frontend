import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { buscarInstitucional, salvarInstitucional } from './lojaInstitucional';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/lojaInstitucional', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { historia: null } });
    expect(await buscarInstitucional()).toEqual({ historia: null });
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-institucional');
  });

  it('salva por PUT, só com os campos que o backend aceita (o corpo dele é estrito)', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: {} });

    await salvarInstitucional({ historia: 'x', whatsapp: null, empresa_id: 3, preco: 1 });

    const [url, opcoes] = api.apiFetch.mock.calls[0];
    expect(url).toBe('/loja-institucional');
    expect(opcoes.method).toBe('PUT');
    expect(JSON.parse(opcoes.body)).toEqual({ historia: 'x', whatsapp: null });
  });
});
