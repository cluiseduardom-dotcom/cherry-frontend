import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('./api', () => ({ apiFetch: apiFetchMock, ApiError: class extends Error {} }));

import { listarTodosProdutos } from './produtos';

const pagina = (page, totalPages, n) => ({ data: { items: Array.from({ length: n }, (_, i) => ({ id: (page - 1) * 100 + i + 1 })), page, totalPages } });

describe('listarTodosProdutos', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('junta todas as páginas (o servidor entrega no máximo 100 por vez)', async () => {
    apiFetchMock
      .mockResolvedValueOnce(pagina(1, 3, 100))
      .mockResolvedValueOnce(pagina(2, 3, 100))
      .mockResolvedValueOnce(pagina(3, 3, 40));

    const r = await listarTodosProdutos();

    expect(r.items).toHaveLength(240);
    expect(r.total).toBe(240);
    expect(apiFetchMock).toHaveBeenCalledTimes(3);
    expect(apiFetchMock.mock.calls[1][0]).toContain('page=2');
    expect(apiFetchMock.mock.calls[0][0]).toContain('pageSize=100');
    expect(apiFetchMock.mock.calls[0][0]).toContain('canal=loja_fisica');
  });

  it('uma página só: uma chamada', async () => {
    apiFetchMock.mockResolvedValueOnce(pagina(1, 1, 5));

    expect((await listarTodosProdutos()).items).toHaveLength(5);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it('resposta sem itens não quebra', async () => {
    apiFetchMock.mockResolvedValueOnce({ data: {} });

    expect(await listarTodosProdutos()).toEqual({ items: [], total: 0 });
  });
});
