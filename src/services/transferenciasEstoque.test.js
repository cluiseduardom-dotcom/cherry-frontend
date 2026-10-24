import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import {
  listarTransferencias, obterTransferencia, criarTransferencia,
  aceitarTransferencia, recusarTransferencia, cancelarTransferencia,
} from './transferenciasEstoque';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/transferenciasEstoque', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listarTransferencias pagina e só envia status quando informado', async () => {
    api.apiFetch.mockResolvedValue({ data: { items: [] } });

    await listarTransferencias();
    expect(api.apiFetch).toHaveBeenLastCalledWith('/estoque/transferencias?page=1&pageSize=20');

    await listarTransferencias({ status: 'pendente', page: 2, pageSize: 5 });
    expect(api.apiFetch).toHaveBeenLastCalledWith('/estoque/transferencias?page=2&pageSize=5&status=pendente');
  });

  it('obterTransferencia chama GET por id', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { id: 3 } });
    expect(await obterTransferencia(3)).toEqual({ id: 3 });
    expect(api.apiFetch).toHaveBeenCalledWith('/estoque/transferencias/3');
  });

  it('criarTransferencia envia o corpo recebido', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { id: 8 } });
    const dados = { origem_local_id: 1, destino_local_id: 2, itens: [{ produto_id: 5, quantidade: 1 }] };

    expect(await criarTransferencia(dados)).toEqual({ id: 8 });
    expect(api.apiFetch).toHaveBeenCalledWith('/estoque/transferencias', { method: 'POST', body: JSON.stringify(dados) });
  });

  it('aceitar envia corpo vazio; recusar e cancelar enviam o motivo', async () => {
    api.apiFetch.mockResolvedValue({ data: {} });

    await aceitarTransferencia(4);
    expect(api.apiFetch).toHaveBeenLastCalledWith('/estoque/transferencias/4/aceitar', { method: 'POST', body: '{}' });

    await recusarTransferencia(4, 'Não conferiu');
    expect(api.apiFetch).toHaveBeenLastCalledWith('/estoque/transferencias/4/recusar', { method: 'POST', body: JSON.stringify({ motivo: 'Não conferiu' }) });

    await cancelarTransferencia(4, 'Criada por engano');
    expect(api.apiFetch).toHaveBeenLastCalledWith('/estoque/transferencias/4/cancelar', { method: 'POST', body: JSON.stringify({ motivo: 'Criada por engano' }) });
  });

  it('propaga o erro do backend', async () => {
    api.apiFetch.mockRejectedValueOnce(new Error('Estoque insuficiente'));
    await expect(criarTransferencia({})).rejects.toThrow('Estoque insuficiente');
  });
});
