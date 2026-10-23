import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('./api', () => ({
  apiFetch: apiFetchMock,
}));

import { criarVenda, listarVendas, obterPreviaCancelamento, cancelarVenda } from './vendas';

describe('criarVenda', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { id: 1 } });
  });

  it('envia meses_prazo em vendas a prazo', async () => {
    await criarVenda({
      canal: 'loja_fisica',
      itens: [{ produto_id: 10, quantidade: 1 }],
      forma_pagamento: 'prazo',
      meses_prazo: 3,
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/vendas', {
      method: 'POST',
      body: JSON.stringify({
        canal: 'loja_fisica',
        itens: [{ produto_id: 10, quantidade: 1 }],
        forma_pagamento: 'prazo',
        meses_prazo: 3,
      }),
    });
  });

  it('não envia meses_prazo em vendas à vista', async () => {
    await criarVenda({
      canal: 'loja_fisica',
      itens: [{ produto_id: 10, quantidade: 1 }],
      forma_pagamento: 'a_vista',
      meses_prazo: 3,
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/vendas', {
      method: 'POST',
      body: JSON.stringify({
        canal: 'loja_fisica',
        itens: [{ produto_id: 10, quantidade: 1 }],
        forma_pagamento: 'a_vista',
      }),
    });
  });
});

describe('listarVendas', () => {
  it('envia filtros server-side quando informados', async () => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { items: [], total: 0, totalPages: 1 } });

    await listarVendas({
      page: 2,
      pageSize: 50,
      status: 'finalizada',
      canal: 'loja_fisica',
      data_de: '2026-09-01',
      data_ate: '2026-09-30',
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/vendas?page=2&pageSize=50&status=finalizada&canal=loja_fisica&data_de=2026-09-01&data_ate=2026-09-30'
    );
  });
});

describe('obterPreviaCancelamento', () => {
  it('chama GET /vendas/:id/cancelamento/previa', async () => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({
      data: {
        venda_id: 42,
        status: 'finalizada',
        exige_autorizacao: false,
        pode_cancelar: true,
      },
    });

    const resultado = await obterPreviaCancelamento(42);

    expect(apiFetchMock).toHaveBeenCalledWith('/vendas/42/cancelamento/previa');
    expect(resultado).toEqual({
      venda_id: 42,
      status: 'finalizada',
      exige_autorizacao: false,
      pode_cancelar: true,
    });
  });
});

describe('cancelarVenda', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ data: { id: 42, status: 'cancelada' } });
  });

  it('envia PATCH /vendas/:id/cancelar apenas com motivo quando autorizacao nao for informada', async () => {
    await cancelarVenda(42, { motivo: 'Cliente desistiu da compra' });

    expect(apiFetchMock).toHaveBeenCalledWith('/vendas/42/cancelar', {
      method: 'PATCH',
      body: JSON.stringify({
        motivo: 'Cliente desistiu da compra',
      }),
    });
  });

  it('envia PATCH /vendas/:id/cancelar com autorizacao (email e senha) quando informados', async () => {
    await cancelarVenda(42, {
      motivo: 'Venda com mais de 7 dias devolvida',
      autorizacao: { email: ' supervisor@loja.com ', senha: 'secretpassword' },
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/vendas/42/cancelar', {
      method: 'PATCH',
      body: JSON.stringify({
        motivo: 'Venda com mais de 7 dias devolvida',
        autorizacao: {
          email: 'supervisor@loja.com',
          senha: 'secretpassword',
        },
      }),
    });
  });
});
