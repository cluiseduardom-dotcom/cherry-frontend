import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { atualizarRetrato, enviarRetrato, listarRetratos, removerRetrato } from './lojaRetratos';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/lojaRetratos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: [{ id: 1 }] });
    expect(await listarRetratos()).toEqual([{ id: 1 }]);
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-retratos');
  });

  it('envia a foto por multipart, só com alt e nome quando preenchidos', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { id: 2 } });
    const arquivo = new File(['x'], 'r.webp', { type: 'image/webp' });

    await enviarRetrato(arquivo, { alt: ' Retrato ', nome: '' });

    const [url, opcoes] = api.apiFetch.mock.calls[0];
    expect(url).toBe('/loja-retratos');
    expect(opcoes.method).toBe('POST');
    expect(opcoes.body).toBeInstanceOf(FormData);
    expect(opcoes.body.get('arquivo')).toBeInstanceOf(File);
    expect(opcoes.body.get('alt')).toBe('Retrato');
    expect(opcoes.body.has('nome')).toBe(false);
  });

  it('atualiza por PATCH, só com os campos que o backend aceita (o corpo dele é estrito)', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { id: 3 } });

    await atualizarRetrato(3, { autorizacao_assinada: true, ativo: true, empresa_id: 9, url: 'x' });

    const [url, opcoes] = api.apiFetch.mock.calls[0];
    expect(url).toBe('/loja-retratos/3');
    expect(opcoes.method).toBe('PATCH');
    expect(JSON.parse(opcoes.body)).toEqual({ autorizacao_assinada: true, ativo: true });
  });

  it('remove por DELETE', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: { removido: true } });
    await removerRetrato(4);
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-retratos/4', { method: 'DELETE' });
  });
});
