import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { listarLocais, saldosDoLocal, criarLocal } from './locaisEstoque';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/locaisEstoque', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listarLocais chama GET /estoque/locais e devolve body.data', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: [{ id: 1 }] });
    expect(await listarLocais()).toEqual([{ id: 1 }]);
    expect(api.apiFetch).toHaveBeenCalledWith('/estoque/locais');
  });

  it('saldosDoLocal pagina com teto de 1000 e só envia busca quando informada', async () => {
    api.apiFetch.mockResolvedValue({ data: { items: [] } });

    await saldosDoLocal(5);
    expect(api.apiFetch).toHaveBeenLastCalledWith('/estoque/locais/5/saldos?page=1&pageSize=1000');

    await saldosDoLocal(5, { busca: 'anel', page: 2, pageSize: 50 });
    expect(api.apiFetch).toHaveBeenLastCalledWith('/estoque/locais/5/saldos?page=2&pageSize=50&busca=anel');
  });

  it('criarLocal faz POST /estoque/locais com o corpo recebido', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { id: 9 } });
    const dados = { tipo: 'maleta', usuario_id: 3 };

    expect(await criarLocal(dados)).toEqual({ id: 9 });
    expect(api.apiFetch).toHaveBeenCalledWith('/estoque/locais', { method: 'POST', body: JSON.stringify(dados) });
  });

  it('propaga o erro do backend sem mascarar', async () => {
    api.apiFetch.mockRejectedValueOnce(new Error('Usuário já possui maleta'));
    await expect(criarLocal({ tipo: 'maleta', usuario_id: 3 })).rejects.toThrow('Usuário já possui maleta');
  });
});
