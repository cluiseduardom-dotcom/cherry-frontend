import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();

vi.mock('./api', () => ({
  apiFetch: apiFetchMock,
}));

import { criarVenda } from './vendas';

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
