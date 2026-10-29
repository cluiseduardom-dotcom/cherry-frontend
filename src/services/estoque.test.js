import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({
  apiFetch: apiFetchMock,
}));

import { EVENTO_ESTOQUE_ALTERADO, listarMovimentacoesRelatorio, registrarMovimentacaoEstoque } from './estoque';

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

describe('registrarMovimentacaoEstoque', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('avisa o menu (evento) depois de registrar a movimentação', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    apiFetchMock.mockResolvedValue({ data: { id: 1, estoque_resultante: 12 } });

    const resultado = await registrarMovimentacaoEstoque(7, { tipo: 'entrada', quantidade: 10 });

    expect(resultado).toEqual({ id: 1, estoque_resultante: 12 });
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(EVENTO_ESTOQUE_ALTERADO);
  });

  it('não avisa o menu quando o backend recusa a movimentação', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    apiFetchMock.mockRejectedValue(new Error('Estoque insuficiente'));

    await expect(registrarMovimentacaoEstoque(7, { tipo: 'saida', quantidade: 99 })).rejects.toThrow('Estoque insuficiente');
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
