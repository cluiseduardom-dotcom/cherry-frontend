import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './api';
import { listarCategorias } from './categorias';
import { listarNiveisCategoria } from './niveisCategoria';
import { listarPadroesSku, buscarConfiguracaoSku } from './configuracoesSku';

describe('services com escopo', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({ data: [] });
  });

  it('produto (padrão) não manda querystring de escopo', async () => {
    await listarCategorias({ page: 1, pageSize: 100 });
    await listarNiveisCategoria();
    await listarPadroesSku();
    await buscarConfiguracaoSku();
    expect(apiFetch.mock.calls.map(([url]) => url)).toEqual([
      '/categorias?page=1&pageSize=100',
      '/niveis-categoria',
      '/configuracoes-sku/padroes',
      '/configuracoes-sku',
    ]);
  });

  it('insumo manda ?escopo=insumo', async () => {
    await listarCategorias({ page: 1, pageSize: 100, escopo: 'insumo' });
    await listarNiveisCategoria({ escopo: 'insumo' });
    await listarPadroesSku({ escopo: 'insumo' });
    await buscarConfiguracaoSku({ escopo: 'insumo' });
    expect(apiFetch.mock.calls.map(([url]) => url)).toEqual([
      '/categorias?page=1&pageSize=100&escopo=insumo',
      '/niveis-categoria?escopo=insumo',
      '/configuracoes-sku/padroes?escopo=insumo',
      '/configuracoes-sku?escopo=insumo',
    ]);
  });
});
