import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({ apiFetch: apiFetchMock }));

import {
  obterAnaliseVendas,
  obterDesempenhoVendedores,
  obterInventario,
  obterRelatorioCredito,
  obterRelatorioProdutos,
} from './relatorios';

describe('serviços de relatórios de gestão', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { ok: true } });
  });

  it('vendas e desempenho enviam só o período e devolvem body.data', async () => {
    expect(await obterAnaliseVendas({ data_de: '2026-03-01', data_ate: '2026-03-31' })).toEqual({ ok: true });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/relatorios/vendas?data_de=2026-03-01&data_ate=2026-03-31');

    await obterDesempenhoVendedores({ data_de: '2026-03-01', data_ate: '2026-03-31' });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/relatorios/desempenho?data_de=2026-03-01&data_ate=2026-03-31');
  });

  it('produtos envia ordem e limite só quando informados', async () => {
    await obterRelatorioProdutos({ data_de: '2026-03-01', data_ate: '2026-03-31', ordem: 'margem', limite: 20 });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/relatorios/produtos?data_de=2026-03-01&data_ate=2026-03-31&ordem=margem&limite=20');

    await obterRelatorioProdutos({ data_de: '2026-03-01', data_ate: '2026-03-31' });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/relatorios/produtos?data_de=2026-03-01&data_ate=2026-03-31');
  });

  it('inventário: sem filtros vai sem query; booleano false é enviado', async () => {
    await obterInventario();
    expect(apiFetchMock).toHaveBeenLastCalledWith('/relatorios/inventario');

    await obterInventario({ tipo: 'insumo', local_id: 3, somente_com_saldo: false, page: 2, pageSize: 50 });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/relatorios/inventario?local_id=3&tipo=insumo&somente_com_saldo=false&page=2&pageSize=50');
  });

  it('crédito: data de referência opcional', async () => {
    await obterRelatorioCredito();
    expect(apiFetchMock).toHaveBeenLastCalledWith('/relatorios/credito');

    await obterRelatorioCredito({ data_ref: '2026-11-21' });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/relatorios/credito?data_ref=2026-11-21');
  });

  it('propaga o erro do backend sem mascarar', async () => {
    apiFetchMock.mockRejectedValue(new Error('Acesso negado'));
    await expect(obterAnaliseVendas({ data_de: '2026-03-01', data_ate: '2026-03-31' })).rejects.toThrow('Acesso negado');
  });
});
