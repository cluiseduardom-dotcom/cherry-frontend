import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({ apiFetch: apiFetchMock }));

import { devolverPix, listarDevolucoesPix, listarPixADevolver } from './pixDevolucao';

describe('serviço de devolução de Pix', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { ok: true } });
  });

  it('lista o que há a devolver convertendo página em limit/offset', async () => {
    await listarPixADevolver({ page: 3, pageSize: 20 });
    expect(apiFetchMock).toHaveBeenCalledWith('/pagamentos-gateway/a-devolver?limit=20&offset=40');
  });

  it('lista o histórico de devoluções', async () => {
    await listarDevolucoesPix();
    expect(apiFetchMock).toHaveBeenCalledWith('/pagamentos-gateway/devolucoes?limit=20&offset=0');
  });

  it('devolve enviando só o motivo (o valor é sempre o integral, decidido pelo backend)', async () => {
    apiFetchMock.mockResolvedValue({ data: { codigo: 'abc', valor: '90.00', status: 'concluida' } });

    const resultado = await devolverPix('abc', { motivo: 'Cliente desistiu' });

    expect(resultado).toEqual({ codigo: 'abc', valor: '90.00', status: 'concluida' });
    expect(apiFetchMock).toHaveBeenCalledWith('/pagamentos-gateway/abc/devolucao', {
      method: 'POST',
      body: JSON.stringify({ motivo: 'Cliente desistiu' }),
    });
  });

  it('escapa o código na URL', async () => {
    await devolverPix('a/b', { motivo: 'abc' });
    expect(apiFetchMock.mock.calls[0][0]).toBe('/pagamentos-gateway/a%2Fb/devolucao');
  });
});
