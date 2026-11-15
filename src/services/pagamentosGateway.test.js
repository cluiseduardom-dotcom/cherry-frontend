import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({ apiFetch: apiFetchMock }));

import { criarCobrancaPix, criarCobrancaPixParaReceber, consultarCobrancaPix } from './pagamentosGateway';

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

  it('cria o Pix para receber fiado/parcela enviando o destino (o servidor confere acesso e valor)', async () => {
    apiFetchMock.mockResolvedValue({ data: { codigo: 'c2', destino: { tipo: 'fiado', aplicado: false, erro: null } } });
    const destino = { tipo: 'fiado', cliente_id: 7 };
    expect((await criarCobrancaPixParaReceber(40, destino)).destino.tipo).toBe('fiado');
    expect(apiFetchMock).toHaveBeenCalledWith('/pagamentos-gateway/pix', {
      method: 'POST',
      body: JSON.stringify({ valor: 40, destino }),
    });
  });
});
