import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({ apiFetch: apiFetchMock }));

import { obterStatusMercadoPago, iniciarConexaoMercadoPago, desconectarMercadoPago } from './mercadoPago';

describe('serviço Mercado Pago', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('lê o status', async () => {
    apiFetchMock.mockResolvedValue({ data: { configurado: true, conectado: false, conectado_em: null } });
    expect(await obterStatusMercadoPago()).toEqual({ configurado: true, conectado: false, conectado_em: null });
    expect(apiFetchMock).toHaveBeenCalledWith('/integracoes/mercadopago');
  });

  it('inicia a conexão por POST sem corpo', async () => {
    apiFetchMock.mockResolvedValue({ data: { url: 'https://auth.mercadopago.com/authorization?x=1' } });
    expect(await iniciarConexaoMercadoPago()).toEqual({ url: 'https://auth.mercadopago.com/authorization?x=1' });
    expect(apiFetchMock).toHaveBeenCalledWith('/integracoes/mercadopago/conectar', { method: 'POST' });
  });

  it('desconecta por DELETE', async () => {
    apiFetchMock.mockResolvedValue({ data: { desconectado: true } });
    expect(await desconectarMercadoPago()).toEqual({ desconectado: true });
    expect(apiFetchMock).toHaveBeenCalledWith('/integracoes/mercadopago', { method: 'DELETE' });
  });
});
