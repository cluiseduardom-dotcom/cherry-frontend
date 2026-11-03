import { describe, expect, it } from 'vitest';
import {
  corpoConta, corpoMovimento, filtrosParaConsulta, hojeBrasilia, lerValor, podeCancelar, rotuloOrigem,
  rotuloTipoConta, situacaoMovimento, totaisDasContas, validarConta, validarMovimento,
} from './bancos';

describe('lerValor', () => {
  it('aceita formato brasileiro e ponto decimal; recusa o resto', () => {
    expect(lerValor('1.234,56')).toBe(1234.56);
    expect(lerValor('1234.5')).toBe(1234.5);
    expect(lerValor('100')).toBe(100);
    expect(lerValor('0,5')).toBe(0.5);
    expect(lerValor('-20,00')).toBe(-20);
    for (const ruim of ['', '  ', 'abc', '1,234', '10,123', '1e3', null, undefined]) expect(lerValor(ruim)).toBeNaN();
  });
});

describe('conta', () => {
  it('valida nome, tipo e saldo', () => {
    expect(validarConta({ nome: 'B', tipo: '' }, { criando: true })).toEqual({ nome: expect.any(String), tipo: expect.any(String) });
    expect(validarConta({ nome: 'Banco', tipo: 'CAIXA', saldo_inicial: '10,999' }, { criando: true }).saldo_inicial).toBeTruthy();
    expect(validarConta({ nome: 'Banco', tipo: 'CAIXA', saldo_inicial: '1.500,00', data_saldo_inicial: '2026-11-01' }, { criando: true })).toEqual({});
  });

  it('só envia campos suportados e não manda tipo nem saldo na edição restrita', () => {
    const form = { nome: ' Itaú ', tipo: 'CONTA_CORRENTE', instituicao_nome: '', agencia: '123', conta: '', observacao: '', saldo_inicial: '1.000,50', data_saldo_inicial: '2026-11-01', principal: true, empresa_id: 9 };
    expect(corpoConta(form, { criando: true })).toEqual({
      nome: 'Itaú', tipo: 'CONTA_CORRENTE', instituicao_nome: null, agencia: '123', conta: null, observacao: null,
      saldo_inicial: 1000.5, data_saldo_inicial: '2026-11-01', principal: true,
    });
    const edicao = corpoConta(form, { criando: false, incluirSaldo: false });
    expect(edicao).not.toHaveProperty('tipo');
    expect(edicao).not.toHaveProperty('saldo_inicial');
    expect(edicao).not.toHaveProperty('principal');
    expect(edicao).not.toHaveProperty('empresa_id');
  });

  it('saldo inicial vazio vira 0', () => {
    expect(corpoConta({ nome: 'Caixa', tipo: 'CAIXA', saldo_inicial: '' }, { criando: true }).saldo_inicial).toBe(0);
  });
});

describe('movimento', () => {
  const base = { conta_bancaria_id: '5', tipo: 'ENTRADA', valor: '250,00', data_movimento: '2026-11-03', descricao: 'Venda balcão' };

  it('aceita o completo e monta corpo numérico', () => {
    expect(validarMovimento(base, '2026-11-03')).toEqual({});
    expect(corpoMovimento(base)).toEqual({ conta_bancaria_id: 5, tipo: 'ENTRADA', valor: 250, data_movimento: '2026-11-03', descricao: 'Venda balcão' });
    expect(corpoMovimento({ ...base, observacao: ' obs ' }).observacao).toBe('obs');
  });

  it('recusa data futura, valor zero/inválido e descrição curta', () => {
    expect(validarMovimento({ ...base, data_movimento: '2026-11-04' }, '2026-11-03').data_movimento).toMatch(/futura/);
    expect(validarMovimento({ ...base, valor: '0' }, '2026-11-03').valor).toBeTruthy();
    expect(validarMovimento({ ...base, valor: '-5' }, '2026-11-03').valor).toBeTruthy();
    expect(validarMovimento({ ...base, descricao: 'ab' }, '2026-11-03').descricao).toBeTruthy();
    expect(validarMovimento({ ...base, conta_bancaria_id: '' }, '2026-11-03').conta_bancaria_id).toBeTruthy();
  });

  it('hoje é o dia de Brasília, não o de UTC', () => {
    expect(hojeBrasilia(new Date('2026-11-04T01:30:00Z'))).toBe('2026-11-03');
    expect(hojeBrasilia(new Date('2026-11-03T15:00:00Z'))).toBe('2026-11-03');
  });
});

describe('totais e situação', () => {
  it('soma só contas ativas', () => {
    const contas = [
      { status: 'ATIVA', saldo_atual: '100.10', a_liberar: '5' },
      { status: 'ATIVA', saldo_atual: '-20.05', a_liberar: '0' },
      { status: 'INATIVA', saldo_atual: '999', a_liberar: '999' },
    ];
    expect(totaisDasContas(contas)).toEqual({ saldo: 80.05, aLiberar: 5, ativas: 2 });
    expect(totaisDasContas(undefined)).toEqual({ saldo: 0, aLiberar: 0, ativas: 0 });
  });

  it('situação e permissão de cancelar', () => {
    expect(situacaoMovimento({ cancelado_em: 'x' }).chave).toBe('cancelado');
    expect(situacaoMovimento({ conciliado: true }).chave).toBe('conciliado');
    expect(situacaoMovimento({}).chave).toBe('pendente');
    expect(podeCancelar({})).toBe(true);
    expect(podeCancelar({ conciliado: true })).toBe(false);
    expect(podeCancelar({ cancelado_em: 'x' })).toBe(false);
  });

  it('rótulos', () => {
    expect(rotuloTipoConta('CONTA_PAGAMENTO')).toBe('Conta de pagamento');
    expect(rotuloTipoConta('CAIXA')).toBe('Caixa');
    expect(rotuloOrigem('API_BANCO')).toBe('Automático');
    expect(rotuloOrigem('NOVA')).toBe('NOVA');
  });
});

describe('filtros', () => {
  it('só manda o que foi escolhido e calcula o deslocamento', () => {
    expect(filtrosParaConsulta({ conta: '', tipo: '', conciliado: '', inicio: '', fim: '', cancelados: false, pagina: 3, porPagina: 50 }))
      .toEqual({ limit: 50, offset: 100 });
    expect(filtrosParaConsulta({ conta: '2', tipo: 'SAIDA', conciliado: false, inicio: '2026-11-01', fim: '2026-11-30', cancelados: true, pagina: 1, porPagina: 50 }))
      .toEqual({ limit: 50, offset: 0, conta_bancaria_id: '2', tipo: 'SAIDA', conciliado: false, data_inicio: '2026-11-01', data_fim: '2026-11-30', incluir_cancelados: true });
  });
});
