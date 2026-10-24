import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({
  apiFetch: apiFetchMock,
}));

import {
  listarMinhasComissoes,
  listarComissoesEquipe,
  listarRepasses,
  confirmarRepasse,
  obterHistoricoComissao,
  obterPercentuais,
  atualizarPercentual,
} from './comissoes';

describe('comissoes service', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  describe('listarMinhasComissoes', () => {
    it('chama GET /comissoes/minhas com parametros padrao de paginacao', async () => {
      const mockData = { items: [], totais: { total_base: '0', total_comissao: '0' }, page: 1, pageSize: 20, total: 0 };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await listarMinhasComissoes();

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/minhas?page=1&pageSize=20');
      expect(res).toEqual(mockData);
    });

    it('inclui data_inicio e data_fim na query string quando informados', async () => {
      apiFetchMock.mockResolvedValueOnce({ data: { items: [] } });

      await listarMinhasComissoes({ page: 2, pageSize: 50, data_inicio: '2026-10-01', data_fim: '2026-10-31' });

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/minhas?page=2&pageSize=50&data_inicio=2026-10-01&data_fim=2026-10-31');
    });
  });

  describe('listarComissoesEquipe', () => {
    it('chama GET /comissoes/equipe sem parametros quando nenhum filtro for passado', async () => {
      const mockData = { items: [], totais: {} };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await listarComissoesEquipe();

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/equipe');
      expect(res).toEqual(mockData);
    });

    it('inclui parametros de periodo quando informados', async () => {
      apiFetchMock.mockResolvedValueOnce({ data: { items: [] } });

      await listarComissoesEquipe({ data_inicio: '2026-10-01', data_fim: '2026-10-31' });

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/equipe?data_inicio=2026-10-01&data_fim=2026-10-31');
    });
  });

  describe('listarRepasses', () => {
    it('chama GET /comissoes/repasses com status e paginacao', async () => {
      const mockData = { items: [], totais: { total_a_repassar: '100.00' } };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await listarRepasses({ status: 'a_repassar', page: 1, pageSize: 20 });

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/repasses?page=1&pageSize=20&status=a_repassar');
      expect(res).toEqual(mockData);
    });
  });

  describe('confirmarRepasse', () => {
    it('chama POST /comissoes/repasses/:id/confirmar sem corpo se observacao estiver vazia', async () => {
      const mockData = { id: 8, status: 'confirmado' };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await confirmarRepasse(8);

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/repasses/8/confirmar', { method: 'POST' });
      expect(res).toEqual(mockData);
    });

    it('envia observacao no corpo JSON quando fornecida', async () => {
      const mockData = { id: 8, status: 'confirmado', observacao: 'Recebi na loja' };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await confirmarRepasse(8, { observacao: '  Recebi na loja  ' });

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/repasses/8/confirmar', {
        method: 'POST',
        body: JSON.stringify({ observacao: 'Recebi na loja' }),
      });
      expect(res).toEqual(mockData);
    });
  });

  describe('obterHistoricoComissao', () => {
    it('chama GET /comissoes/:id/historico', async () => {
      const mockData = { comissao: { id: 12 }, eventos: [] };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await obterHistoricoComissao(12);

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/12/historico');
      expect(res).toEqual(mockData);
    });
  });

  describe('obterPercentuais', () => {
    it('chama GET /comissoes/percentuais', async () => {
      const mockData = { padrao: '3.0000', usuarios: [] };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await obterPercentuais();

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/percentuais');
      expect(res).toEqual(mockData);
    });
  });

  describe('atualizarPercentual', () => {
    it('define percentual padrao da empresa (sem usuario_id)', async () => {
      const mockData = { percentual: '5.0000' };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await atualizarPercentual({ percentual: 5 });

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/percentuais', {
        method: 'PUT',
        body: JSON.stringify({ percentual: 5 }),
      });
      expect(res).toEqual(mockData);
    });

    it('define percentual especifico de um usuario', async () => {
      const mockData = { usuario_id: 2, percentual: '7.5000' };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await atualizarPercentual({ usuario_id: 2, percentual: '7.5' });

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/percentuais', {
        method: 'PUT',
        body: JSON.stringify({ percentual: 7.5, usuario_id: 2 }),
      });
      expect(res).toEqual(mockData);
    });

    it('remove regra enviando percentual null', async () => {
      const mockData = { usuario_id: 2, percentual: null };
      apiFetchMock.mockResolvedValueOnce({ data: mockData });

      const res = await atualizarPercentual({ usuario_id: 2, percentual: null });

      expect(apiFetchMock).toHaveBeenCalledWith('/comissoes/percentuais', {
        method: 'PUT',
        body: JSON.stringify({ percentual: null, usuario_id: 2 }),
      });
      expect(res).toEqual(mockData);
    });
  });
});
