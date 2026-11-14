import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { listarContasReceber, listarRecebimentosContaReceber, marcarContaReceberComoRecebida, receberContaReceber } from './contasReceber';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/contasReceber', () => {
  beforeEach(() => { vi.clearAllMocks(); api.apiFetch.mockResolvedValue({ data: { ok: true } }); });

  it('lista com filtros e mantém a rota antiga de receber o restante', async () => {
    await listarContasReceber({ page: 2, status: 'pendente', vencimentoDe: '2026-11-01' });
    await marcarContaReceberComoRecebida(9);

    expect(api.apiFetch.mock.calls[0][0]).toBe('/contas-receber?page=2&pageSize=20&status=pendente&vencimento_de=2026-11-01');
    expect(api.apiFetch.mock.calls[1]).toEqual(['/contas-receber/9/receber', { method: 'PATCH' }]);
  });

  it('recebimento parcial: POST com Idempotency-Key e só os campos do contrato (empresa, parcela e status nunca vão)', async () => {
    await receberContaReceber(9, { valor: 40, forma_pagamento: 'pix', observacao: 'Entrada', empresa_id: 3, parcela_id: 5, status: 'recebido' }, 'chave-12345678');

    const [rota, opcoes] = api.apiFetch.mock.calls[0];

    expect(rota).toBe('/contas-receber/9/recebimentos');
    expect(opcoes.method).toBe('POST');
    expect(opcoes.headers).toEqual({ 'Idempotency-Key': 'chave-12345678' });
    expect(JSON.parse(opcoes.body)).toEqual({ valor: 40, forma_pagamento: 'pix', observacao: 'Entrada' });
  });

  it('sem valor, não envia valor (o servidor recebe o restante); sem observação, não envia observação', async () => {
    await receberContaReceber(9, { forma_pagamento: 'dinheiro' }, 'chave-87654321');

    expect(JSON.parse(api.apiFetch.mock.calls[0][1].body)).toEqual({ forma_pagamento: 'dinheiro' });
  });

  it('histórico de recebimentos', async () => {
    await listarRecebimentosContaReceber(9);

    expect(api.apiFetch.mock.calls[0][0]).toBe('/contas-receber/9/recebimentos');
  });
});
