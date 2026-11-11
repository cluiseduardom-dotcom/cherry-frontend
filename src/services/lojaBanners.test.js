import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { atualizarBanner, criarBanner, enviarImagemDoBanner, listarBanners, removerBanner, removerImagemDoBanner } from './lojaBanners';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/lojaBanners', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista e cria', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: [{ id: 1 }] });
    expect(await listarBanners()).toEqual([{ id: 1 }]);
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-banners');

    api.apiFetch.mockResolvedValueOnce({ data: { id: 2 } });
    await criarBanner({ titulo: 'x' });
    expect(api.apiFetch.mock.calls[1][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ titulo: 'x' }) });
  });

  it('atualiza por PATCH só com os campos que o backend aceita (o corpo dele é estrito)', async () => {
    api.apiFetch.mockResolvedValueOnce({ data: {} });
    await atualizarBanner(3, { ativo: true, titulo: 'x', empresa_id: 9, imagem_direita: 'u' });

    const [url, opcoes] = api.apiFetch.mock.calls[0];
    expect(url).toBe('/loja-banners/3');
    expect(opcoes.method).toBe('PATCH');
    expect(JSON.parse(opcoes.body)).toEqual({ ativo: true, titulo: 'x' });
  });

  it('envia a imagem por multipart no lado certo, e remove imagem e faixa por DELETE', async () => {
    api.apiFetch.mockResolvedValue({ data: {} });
    await enviarImagemDoBanner(4, 'esquerda', new File(['x'], 'a.webp', { type: 'image/webp' }));
    const [url, opcoes] = api.apiFetch.mock.calls[0];
    expect(url).toBe('/loja-banners/4/imagem/esquerda');
    expect(opcoes.method).toBe('PUT');
    expect(opcoes.body.get('arquivo')).toBeInstanceOf(File);

    await removerImagemDoBanner(4, 'direita');
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-banners/4/imagem/direita', { method: 'DELETE' });
    await removerBanner(4);
    expect(api.apiFetch).toHaveBeenCalledWith('/loja-banners/4', { method: 'DELETE' });
  });
});
