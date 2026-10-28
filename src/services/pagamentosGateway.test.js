import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({ apiFetch: apiFetchMock }));

import { criarCobrancaPix, consultarCobrancaPix } from './pagamentosGateway';

describe('serviço de Pix do gateway', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('cria a cobrança enviando só o valor', async () => {
    apiFetchMock.mockResolvedValue({ data: { codigo: 'c1', status: 'pendente' } });
    expect(await criarCobrancaPix(25.5)).toEqual({ codigo: 'c1', status: 'pendente' });
    expect(apiFetchMock).toHaveBeenCalledWith('/pagamentos-gateway/pix', {
      method: 'POST',
      body: JSON.stringify({ valor: 25.5 }),
    });
  });

  it('consulta a cobrança pelo código', async () => {
    apiFetchMock.mockResolvedValue({ data: { codigo: 'c1', status: 'pago' } });
    expect(await consultarCobrancaPix('c1')).toEqual({ codigo: 'c1', status: 'pago' });
    expect(apiFetchMock).toHaveBeenCalledWith('/pagamentos-gateway/c1');
  });
});
