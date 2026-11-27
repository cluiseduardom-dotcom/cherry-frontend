import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';
import { abrirSessao, alterarAtivoCaixa, criarCaixa, detalharSessao, fecharSessao, lancarMovimento, listarCaixas, listarSessoes, sessaoAtual } from './caixa';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('services/caixa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.apiFetch.mockResolvedValue({ data: { caixas: [{ id: 1 }], caixa: { id: 1 }, atual: null, sessao: { id: 9 }, movimento: { id: 3 } } });
  });

  it('leituras vão para as rotas certas e devolvem o miolo da resposta', async () => {
    expect(await listarCaixas()).toEqual([{ id: 1 }]);
    expect(await sessaoAtual()).toBeNull();
    await listarSessoes();
    await listarSessoes({ status: 'aberta', caixaId: 4, pagina: 2, limite: 10 });
    await detalharSessao(9);

    expect(api.apiFetch.mock.calls.map((c) => c[0])).toEqual([
      '/caixa/caixas',
      '/caixa/sessao-atual',
      '/caixa/sessoes?page=1&pageSize=20',
      '/caixa/sessoes?page=2&pageSize=10&status=aberta&caixa_id=4',
      '/caixa/sessoes/9',
    ]);
  });

  it('criar e ativar/desativar caixa: só os campos do contrato', async () => {
    await criarCaixa('Balcão 1');
    await alterarAtivoCaixa(5, false);

    const [rotaC, opC] = api.apiFetch.mock.calls[0];
    const [rotaA, opA] = api.apiFetch.mock.calls[1];

    expect(rotaC).toBe('/caixa/caixas');
    expect(opC.method).toBe('POST');
    expect(JSON.parse(opC.body)).toEqual({ nome: 'Balcão 1' });
    expect(rotaA).toBe('/caixa/caixas/5');
    expect(opA.method).toBe('PATCH');
    expect(JSON.parse(opA.body)).toEqual({ ativo: false });
  });

  it('abrir: caixa_id e saldo_inicial, sem empresa nem usuário', async () => {
    await abrirSessao({ caixaId: 2, saldoInicial: 100, empresa_id: 9, operador_id: 3 });

    const [rota, op] = api.apiFetch.mock.calls[0];

    expect(rota).toBe('/caixa/sessoes');
    expect(op.method).toBe('POST');
    expect(JSON.parse(op.body)).toEqual({ caixa_id: 2, saldo_inicial: 100 });
  });

  it('movimento: Idempotency-Key obrigatória no cabeçalho e só tipo, valor e motivo no corpo', async () => {
    await lancarMovimento(9, { tipo: 'sangria', valor: 30, motivo: 'Cofre', usuario_id: 1 }, 'chave-12345678');

    const [rota, op] = api.apiFetch.mock.calls[0];

    expect(rota).toBe('/caixa/sessoes/9/movimentos');
    expect(op.headers).toEqual({ 'Idempotency-Key': 'chave-12345678' });
    expect(JSON.parse(op.body)).toEqual({ tipo: 'sangria', valor: 30, motivo: 'Cofre' });
  });

  it('fechamento: conferência com o contado; justificativa só quando existe; o esperado nunca vai', async () => {
    api.apiFetch.mockResolvedValue({ data: { divergente: false } });
    await fecharSessao(9, { conferencia: [{ forma: 'dinheiro', informado: 90, esperado: 1 }] });
    await fecharSessao(9, { conferencia: [{ forma: 'dinheiro', informado: 85 }], justificativa: 'Troco errado' });

    const [rota, op1] = api.apiFetch.mock.calls[0];
    const [, op2] = api.apiFetch.mock.calls[1];

    expect(rota).toBe('/caixa/sessoes/9/fechamento');
    expect(op1.method).toBe('POST');
    expect(JSON.parse(op2.body)).toEqual({ conferencia: [{ forma: 'dinheiro', informado: 85 }], justificativa: 'Troco errado' });
    expect(JSON.parse(op1.body).justificativa).toBeUndefined();
  });
});
