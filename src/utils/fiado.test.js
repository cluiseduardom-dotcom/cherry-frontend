import { describe, it, expect } from 'vitest';
import { dataBr, efeitoDoLancamento, lerValor, novaChave, tituloDoLancamento, validarCompra, validarMotivo, validarPagamento, valorParaCampo } from './fiado';

describe('lerValor', () => {
  it('aceita vírgula, milhar e ponto decimal; vazio = null; lixo = NaN', () => {
    expect(lerValor('25')).toBe(25);
    expect(lerValor('25,90')).toBe(25.9);
    expect(lerValor('1.234,56')).toBe(1234.56);
    expect(lerValor('12.5')).toBe(12.5);
    expect(lerValor(' ')).toBeNull();
    expect(lerValor(undefined)).toBeNull();
    for (const ruim of ['abc', '1,2,3', '-5', 'R$ 10', '1e3']) expect(lerValor(ruim)).toBeNaN();
  });
});

describe('validarCompra', () => {
  it('aceita valor e descrição válidos', () => {
    expect(validarCompra({ valor: '45,50', descricao: 'Compras do mês' })).toBeNull();
  });

  it('recusa valor vazio, zero, enorme, com 3 casas e descrição vazia ou longa', () => {
    expect(validarCompra({ valor: '', descricao: 'x' })).toMatch(/Informe o valor/);
    expect(validarCompra({ valor: '0', descricao: 'x' })).toMatch(/maior que zero/);
    expect(validarCompra({ valor: '1000000', descricao: 'x' })).toMatch(/máximo/);
    expect(validarCompra({ valor: '10,123', descricao: 'x' })).toMatch(/2 casas/);
    expect(validarCompra({ valor: '10', descricao: '   ' })).toMatch(/Descreva/);
    expect(validarCompra({ valor: '10', descricao: 'x'.repeat(201) })).toMatch(/200 caracteres/);
  });
});

describe('validarPagamento', () => {
  it('aceita até o saldo (inclusive), recusa acima, sem erro de ponto flutuante', () => {
    expect(validarPagamento({ valor: '30' }, 100)).toBeNull();
    expect(validarPagamento({ valor: '100' }, 100)).toBeNull();
    expect(validarPagamento({ valor: '0,30' }, 0.1 + 0.2)).toBeNull();
    expect(validarPagamento({ valor: '100,01' }, 100)).toMatch(/maior que o saldo/);
    expect(validarPagamento({ valor: '' }, 100)).toMatch(/Informe o valor/);
    expect(validarPagamento({ valor: '1,234' }, 100)).toMatch(/2 casas/);
  });
});

describe('validarMotivo', () => {
  it('mínimo 3 e máximo 300', () => {
    expect(validarMotivo('ok')).toMatch(/mínimo 3/);
    expect(validarMotivo('erro')).toBeNull();
    expect(validarMotivo('x'.repeat(301))).toMatch(/300/);
  });
});

describe('formatação', () => {
  it('valorParaCampo e dataBr (sem fuso)', () => {
    expect(valorParaCampo(1234.5)).toBe('1234,50');
    expect(dataBr('2026-01-31')).toBe('31/01/2026');
    expect(dataBr('2026-01-31T00:00:00.000Z')).toBe('31/01/2026');
    expect(dataBr(null)).toBe('');
  });

  it('chave de idempotência cumpre o formato do backend e muda a cada chamada', () => {
    const a = novaChave();

    expect(a).toMatch(/^[A-Za-z0-9_-]{8,80}$/);
    expect(novaChave()).not.toBe(a);
  });
});

describe('extrato', () => {
  it('título e efeito de cada linha, inclusive estorno conforme o original', () => {
    const compra = { id: 1, tipo: 'compra' };
    const pagamento = { id: 2, tipo: 'pagamento', forma: 'pix' };
    const porId = new Map([[1, compra], [2, pagamento]]);

    expect(tituloDoLancamento(compra)).toBe('Dívida');
    expect(tituloDoLancamento(pagamento)).toBe('Pagamento (Pix)');
    expect(tituloDoLancamento({ tipo: 'pagamento', forma: null })).toBe('Pagamento');
    expect(efeitoDoLancamento(compra)).toBe('aumenta');
    expect(efeitoDoLancamento(pagamento)).toBe('reduz');
    expect(efeitoDoLancamento({ tipo: 'estorno', estorna_id: 1 }, porId)).toBe('reduz');
    expect(efeitoDoLancamento({ tipo: 'estorno', estorna_id: 2 }, porId)).toBe('aumenta');
    expect(efeitoDoLancamento({ tipo: 'estorno', estorna_id: 99 }, porId)).toBe('neutro');
  });
});
