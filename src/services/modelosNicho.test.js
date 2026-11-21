import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({ apiFetch: apiFetchMock }));

import { aplicarModeloNicho, listarModelosNicho } from './modelosNicho';

describe('serviço de modelos de nicho', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { ok: true } });
  });

  it('lista e aplica pelo id', async () => {
    expect(await listarModelosNicho()).toEqual({ ok: true });
    expect(apiFetchMock).toHaveBeenLastCalledWith('/modelos-nicho');
    await aplicarModeloNicho('confeitaria');
    expect(apiFetchMock).toHaveBeenLastCalledWith('/modelos-nicho/confeitaria/aplicar', { method: 'POST', body: '{}' });
  });

  it('propaga o 409 do backend sem mascarar', async () => {
    apiFetchMock.mockRejectedValue(new Error('Esta empresa já tem categorias de produto.'));
    await expect(aplicarModeloNicho('moda')).rejects.toThrow(/já tem categorias/);
  });
});
