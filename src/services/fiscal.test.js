import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({ apiFetch: apiFetchMock }));

import {
  aplicarFiscalEmLote, atualizarProdutoFiscal, listarProdutosFiscais, obterEmpresaFiscal, obterProntidao, salvarEmpresaFiscal,
} from './fiscal';

describe('serviço de fiscal (preparo)', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { ok: true } });
  });

  it('prontidão e empresa', async () => {
    expect(await obterProntidao()).toEqual({ ok: true });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/fiscal/prontidao');
    await obterEmpresaFiscal();
    expect(apiFetchMock).toHaveBeenLastCalledWith('/fiscal/empresa');
    await salvarEmpresaFiscal({ ambiente: 'producao' });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/fiscal/empresa', { method: 'PUT', body: JSON.stringify({ ambiente: 'producao' }) });
  });

  it('lista produtos com filtro, busca e paginação só quando informados', async () => {
    await listarProdutosFiscais();
    expect(apiFetchMock).toHaveBeenLastCalledWith('/fiscal/produtos?filtro=pendentes&page=1&pageSize=20');
    await listarProdutosFiscais({ filtro: 'todos', q: 'anel', page: 2, pageSize: 50 });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/fiscal/produtos?filtro=todos&q=anel&page=2&pageSize=50');
  });

  it('atualiza um produto e aplica em lote', async () => {
    await atualizarProdutoFiscal(7, { ncm: '71171900', cest: null });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/fiscal/produtos/7', { method: 'PATCH', body: JSON.stringify({ ncm: '71171900', cest: null }) });
    await aplicarFiscalEmLote([1, 2], { ncm: '71171900', origem_mercadoria: 0 });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/fiscal/produtos/lote', { method: 'POST', body: JSON.stringify({ produto_ids: [1, 2], ncm: '71171900', origem_mercadoria: 0 }) });
  });

  it('propaga o erro do backend sem mascarar', async () => {
    apiFetchMock.mockRejectedValue(new Error('Funcionalidade não incluída no seu plano. Fale com a GiroNex.'));
    await expect(obterProntidao()).rejects.toThrow(/não incluída/);
  });
});
