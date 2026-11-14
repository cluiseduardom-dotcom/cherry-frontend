import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { cobrancaFiado, estornarLancamentoFiado, extratoFiado, lancarCompraFiado, lancarPagamentoFiado, listarClientesFiado, resumoFiado } from './fiado';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/fiado', () => {
  beforeEach(() => { vi.clearAllMocks(); api.apiFetch.mockResolvedValue({ data: { ok: true } }); });

  it('resumo e listas vão para as rotas certas, com consulta só do que foi informado', async () => {
    await resumoFiado();
    await resumoFiado({ de: '2026-11-01', ate: '2026-11-30' });
    await listarClientesFiado({ busca: ' ana ', comSaldo: true, pagina: 2, limite: 10 });
    await extratoFiado(7, { pagina: 3 });

    expect(api.apiFetch.mock.calls.map((c) => c[0])).toEqual([
      '/fiado/resumo',
      '/fiado/resumo?de=2026-11-01&ate=2026-11-30',
      '/fiado/clientes?page=2&pageSize=10&busca=ana&com_saldo=true',
      '/fiado/clientes/7/extrato?page=3&pageSize=20',
    ]);
  });

  it('compra e pagamento: POST com Idempotency-Key e só os campos do contrato (empresa nunca vai)', async () => {
    await lancarCompraFiado(7, { valor: 12.5, descricao: 'Pão', data: '2026-11-10', empresa_id: 9 }, 'chave-12345678');
    await lancarPagamentoFiado(7, { valor: 5, forma: 'pix', cliente_id: 3 }, 'chave-87654321');

    const [rotaC, opC] = api.apiFetch.mock.calls[0];
    const [rotaP, opP] = api.apiFetch.mock.calls[1];

    expect(rotaC).toBe('/fiado/clientes/7/compras');
    expect(opC.method).toBe('POST');
    expect(opC.headers).toEqual({ 'Idempotency-Key': 'chave-12345678' });
    expect(JSON.parse(opC.body)).toEqual({ valor: 12.5, descricao: 'Pão', data: '2026-11-10' });
    expect(rotaP).toBe('/fiado/clientes/7/pagamentos');
    expect(JSON.parse(opP.body)).toEqual({ valor: 5, forma: 'pix' });
  });

  it('estorno e cobrança', async () => {
    await estornarLancamentoFiado(55, 'engano', 'chave-aaaaaaaa');
    await cobrancaFiado(7);

    expect(api.apiFetch.mock.calls[0][0]).toBe('/fiado/lancamentos/55/estorno');
    expect(JSON.parse(api.apiFetch.mock.calls[0][1].body)).toEqual({ motivo: 'engano' });
    expect(api.apiFetch.mock.calls[1][0]).toBe('/fiado/clientes/7/cobranca');
  });
});
