import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({ apiFetch: apiFetchMock }));

import {
  buscarOrdem,
  cancelarOrdem,
  concluirOrdem,
  criarOrdem,
  iniciarOrdem,
  listarOrdens,
  obterFichaTecnica,
  obterNecessidade,
  regularizarInsumos,
  salvarFichaTecnica,
} from './producao';

describe('serviço de produção (PCP)', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { ok: true } });
  });

  it('lista ordens com filtros só quando informados', async () => {
    await listarOrdens();
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/ordens?page=1&pageSize=20');
    await listarOrdens({ status: 'planejada', produto_id: 4, page: 2, pageSize: 10 });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/ordens?status=planejada&produto_id=4&page=2&pageSize=10');
  });

  it('cria ordem enviando só os campos suportados', async () => {
    await criarOrdem({ produto_id: 3, quantidade_planejada: 10, prazo: '', observacao: '' });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/ordens', { method: 'POST', body: JSON.stringify({ produto_id: 3, quantidade_planejada: 10 }) });
    await criarOrdem({ produto_id: 3, quantidade_planejada: 10, prazo: '2026-12-01', observacao: 'Natal' });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/ordens', {
      method: 'POST',
      body: JSON.stringify({ produto_id: 3, quantidade_planejada: 10, prazo: '2026-12-01', observacao: 'Natal' }),
    });
  });

  it('ações de estado usam PATCH nas rotas certas', async () => {
    await iniciarOrdem(7);
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/ordens/7/iniciar', { method: 'PATCH', body: '{}' });
    await concluirOrdem(7, { quantidade_produzida: 8, quantidade_perdida: 2 });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/ordens/7/concluir', { method: 'PATCH', body: JSON.stringify({ quantidade_produzida: 8, quantidade_perdida: 2 }) });
    await regularizarInsumos(7);
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/ordens/7/regularizar-insumos', { method: 'PATCH', body: '{}' });
    await cancelarOrdem(7, 'Sem tempo');
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/ordens/7/cancelar', { method: 'PATCH', body: JSON.stringify({ motivo: 'Sem tempo' }) });
  });

  it('detalhe, necessidade e ficha técnica', async () => {
    expect(await buscarOrdem(7)).toEqual({ ok: true });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/ordens/7');
    await obterNecessidade({ produto_id: 3, quantidade: 5 });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/producoes/necessidade?produto_id=3&quantidade=5');
    await obterFichaTecnica(3);
    expect(apiFetchMock).toHaveBeenLastCalledWith('/produtos/3/ficha-tecnica');
    await salvarFichaTecnica(3, [{ insumo_produto_id: 1, quantidade_necessaria: 2 }]);
    expect(apiFetchMock).toHaveBeenLastCalledWith('/produtos/3/ficha-tecnica', {
      method: 'POST',
      body: JSON.stringify({ rendimento: 1, itens: [{ insumo_produto_id: 1, quantidade_necessaria: 2 }] }),
    });
    await salvarFichaTecnica(3, [{ insumo_produto_id: 1, quantidade_necessaria: 500 }], 12);
    expect(apiFetchMock).toHaveBeenLastCalledWith('/produtos/3/ficha-tecnica', {
      method: 'POST',
      body: JSON.stringify({ rendimento: 12, itens: [{ insumo_produto_id: 1, quantidade_necessaria: 500 }] }),
    });
  });

  it('propaga o erro do backend sem mascarar', async () => {
    apiFetchMock.mockRejectedValue(new Error('Funcionalidade não incluída no seu plano. Fale com a GiroNex.'));
    await expect(listarOrdens()).rejects.toThrow(/não incluída/);
  });
});
