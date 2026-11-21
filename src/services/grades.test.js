import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({ apiFetch: apiFetchMock }));

import { acrescentarVariacoes, atualizarGrade, buscarGrade, criarGrade, listarGrades } from './grades';

describe('serviço de grades', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { ok: true } });
  });

  it('lista, busca, cria, acrescenta e atualiza nas rotas certas', async () => {
    expect(await listarGrades()).toEqual({ ok: true });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/grades?page=1&pageSize=20');
    await buscarGrade(4);
    expect(apiFetchMock).toHaveBeenLastCalledWith('/grades/4');
    await criarGrade({ nome: 'X' });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/grades', { method: 'POST', body: JSON.stringify({ nome: 'X' }) });
    await acrescentarVariacoes(4, [{ valores: { Tamanho: 'G' } }]);
    expect(apiFetchMock).toHaveBeenLastCalledWith('/grades/4/variacoes', { method: 'POST', body: JSON.stringify({ variacoes: [{ valores: { Tamanho: 'G' } }] }) });
    await atualizarGrade(4, { nome: 'Y' });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/grades/4', { method: 'PATCH', body: JSON.stringify({ nome: 'Y' }) });
  });

  it('propaga o erro do backend sem mascarar', async () => {
    apiFetchMock.mockRejectedValue(new Error('Já existe uma grade com este nome'));
    await expect(criarGrade({})).rejects.toThrow(/Já existe/);
  });
});
