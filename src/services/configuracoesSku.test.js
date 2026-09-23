import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({
  apiFetch: apiFetchMock,
}));

import { buscarConfiguracaoSku, listarPadroesSku, salvarConfiguracaoSku } from './configuracoesSku';

describe('configuracoesSku service', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('listarPadroesSku chama GET /configuracoes-sku/padroes e retorna dados', async () => {
    const padroesMock = [
      { id: 1, nome: 'Padrão SemiJoias', padrao: true, separador: '-', tamanho_sequencia: 3 },
      { id: 2, nome: 'Padrão Alternativo', padrao: false, separador: '_', tamanho_sequencia: 4 },
    ];
    apiFetchMock.mockResolvedValueOnce({ data: padroesMock });

    const resultado = await listarPadroesSku();

    expect(apiFetchMock).toHaveBeenCalledWith('/configuracoes-sku/padroes');
    expect(resultado).toEqual(padroesMock);
  });

  it('buscarConfiguracaoSku chama GET /configuracoes-sku e retorna dados', async () => {
    const configMock = { id: 1, nome: 'Padrão Principal', padrao: true };
    apiFetchMock.mockResolvedValueOnce({ data: configMock });

    const resultado = await buscarConfiguracaoSku();

    expect(apiFetchMock).toHaveBeenCalledWith('/configuracoes-sku');
    expect(resultado).toEqual(configMock);
  });

  it('salvarConfiguracaoSku chama PUT /configuracoes-sku com payload serializado', async () => {
    const payload = {
      nome: 'Novo Padrão',
      padrao: true,
      tipo_sku: 'numerico',
      separador: '-',
      prefixo: 'CH',
      sufixo: '',
      tamanho_sequencia: 3,
      inicio_sequencia: 1,
      segmentos: [{ nivel: 1, ordem: 1, nome: 'Família', obrigatorio: true, participa_sku: true }],
    };
    apiFetchMock.mockResolvedValueOnce({ data: [{ id: 3, ...payload }] });

    const resultado = await salvarConfiguracaoSku(payload);

    expect(apiFetchMock).toHaveBeenCalledWith('/configuracoes-sku', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    expect(resultado).toEqual([{ id: 3, ...payload }]);
  });
});
