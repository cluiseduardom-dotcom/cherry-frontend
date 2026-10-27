import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { listarNotificacoes } from './notificacoes';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/notificacoes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listarNotificacoes chama GET /notificacoes e devolve body.data', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { total: 1, itens: [{ id: 'falta:1' }] } });
    expect(await listarNotificacoes()).toEqual({ total: 1, itens: [{ id: 'falta:1' }] });
    expect(api.apiFetch).toHaveBeenCalledWith('/notificacoes');
  });
});
