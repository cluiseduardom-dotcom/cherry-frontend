import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({
  apiFetch: apiFetchMock,
}));

import { listarMovimentacoesRelatorio } from './estoque';

describe('listarMovimentacoesRelatorio', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { items: [], total: 0, totalPages: 1 } });
  });

  it('envia filtros de relatório para o backend', async () => {
    await listarMovimentacoesRelatorio({
      page: 2,
      pageSize: 50,
      produto_id: 10,
      data_de: '2026-09-01',
      data_ate: '2026-09-30',
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/produtos/movimentacoes?page=2&pageSize=50&produto_id=10&data_de=2026-09-01&data_ate=2026-09-30'
    );
  });
});
