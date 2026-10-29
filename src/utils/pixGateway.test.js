import { describe, it, expect } from 'vitest';
import { avisoPixIndisponivel, ROTA_CONEXAO_MERCADO_PAGO, gatewayIndisponivel, situacaoCobranca, tempoRestante, pagamentoComCobranca, pagamentoDoGateway } from './pixGateway';

describe('gatewayIndisponivel', () => {
  it('só o 409 cai no Pix manual', () => {
    expect(gatewayIndisponivel({ status: 409 })).toBe(true);
    expect(gatewayIndisponivel({ status: 424 })).toBe(false);
    expect(gatewayIndisponivel({ status: 0 })).toBe(false);
    expect(gatewayIndisponivel(null)).toBe(false);
  });
});

describe('situacaoCobranca', () => {
  it('traduz o status da API', () => {
    expect(situacaoCobranca({ status: 'pendente', expirada: false })).toBe('aguardando');
    expect(situacaoCobranca({ status: 'pago', expirada: false })).toBe('pago');
    expect(situacaoCobranca({ status: 'pendente', expirada: true })).toBe('encerrada');
    expect(situacaoCobranca({ status: 'cancelado' })).toBe('encerrada');
    expect(situacaoCobranca({ status: 'falhou' })).toBe('encerrada');
    expect(situacaoCobranca({ status: 'estornado' })).toBe('encerrada');
    expect(situacaoCobranca(undefined)).toBe('aguardando');
  });
});

describe('tempoRestante', () => {
  const agora = new Date('2026-10-27T12:00:00Z').getTime();
  it('conta até a expiração e trava em zero', () => {
    expect(tempoRestante('2026-10-27T12:29:05Z', agora)).toBe('29:05');
    expect(tempoRestante('2026-10-27T12:00:09Z', agora)).toBe('00:09');
    expect(tempoRestante('2026-10-27T11:00:00Z', agora)).toBe('00:00');
  });
  it('sem data válida não mostra nada', () => {
    expect(tempoRestante(undefined, agora)).toBe('');
    expect(tempoRestante('x', agora)).toBe('');
  });
  it('usa os segundos do servidor e só o tempo decorrido do relógio local', () => {
    // relógio do PC 15h adiantado: a data absoluta daria 00:00, mas os segundos do servidor mandam
    const pcErrado = agora + 15 * 3600 * 1000;
    expect(tempoRestante('2026-10-27T12:30:00Z', pcErrado, 1800, pcErrado)).toBe('30:00');
    expect(tempoRestante('2026-10-27T12:30:00Z', pcErrado + 65 * 1000, 1800, pcErrado)).toBe('28:55');
    expect(tempoRestante('2026-10-27T12:30:00Z', pcErrado + 2000 * 1000, 1800, pcErrado)).toBe('00:00');
  });
  it('relógio local que anda para trás não aumenta a validade', () => {
    expect(tempoRestante('x', agora - 5000, 600, agora)).toBe('10:00');
  });
  it('sem segundos do servidor, cai no cálculo por data', () => {
    expect(tempoRestante('2026-10-27T12:29:05Z', agora, undefined, agora)).toBe('29:05');
    expect(tempoRestante('2026-10-27T12:29:05Z', agora, null, null)).toBe('29:05');
  });
});

describe('pagamentoComCobranca', () => {
  it('guarda os segundos do servidor e o instante em que chegaram', () => {
    const p = pagamentoComCobranca(
      { forma_pagamento: 'pix', valor: 10, numero_parcelas: 1, status: 'pendente' },
      { codigo: 'abc', qr_code: '000201', expira_em: '2026-10-27T12:30:00Z', expira_em_segundos: 1799 },
      123456
    );
    expect(p.pix).toMatchObject({ expira_em_segundos: 1799, recebido_em: 123456 });
  });

  it('guarda o código e os dados do QR só para a tela', () => {
    const p = pagamentoComCobranca(
      { forma_pagamento: 'pix', valor: 10, numero_parcelas: 1, status: 'pendente' },
      { codigo: 'abc', qr_code: '000201', qr_code_base64: 'AAA', expira_em: '2026-10-27T12:30:00Z', status: 'pendente' }
    );
    expect(p).toMatchObject({ cobranca_codigo: 'abc', status: 'pendente', pix: { qr_code: '000201', qr_code_base64: 'AAA' } });
    expect(typeof p.pix.recebido_em).toBe('number');
    expect(pagamentoDoGateway(p)).toBe(true);
    expect(pagamentoDoGateway({ forma_pagamento: 'pix', valor: 10 })).toBe(false);
  });
});

describe('avisoPixIndisponivel', () => {
  const MOTIVOS = ['loja_nao_conectada', 'nao_configurado', null, undefined, 'outro'];

  it('sempre deixa claro que o Pix segue manual e que o operador confere no banco', () => {
    for (const motivo of MOTIVOS) {
      for (const podeConectar of [true, false]) {
        const { texto } = avisoPixIndisponivel(motivo, { podeConectar });
        expect(texto).toContain('Este Pix será manual');
        expect(texto).toContain('confirme o recebimento no seu banco');
      }
    }
  });

  it('admin com loja não conectada: texto direto e atalho para a conexão', () => {
    const aviso = avisoPixIndisponivel('loja_nao_conectada', { podeConectar: true });
    expect(aviso.texto).toContain('Conecte para cobrar por QR');
    expect(aviso.texto).not.toContain('administrador');
    expect(aviso.acao).toEqual({ to: ROTA_CONEXAO_MERCADO_PAGO, rotulo: 'Conectar Mercado Pago' });
  });

  it('quem não é admin é orientado a pedir ao administrador, sem atalho', () => {
    const aviso = avisoPixIndisponivel('loja_nao_conectada');
    expect(aviso.texto).toContain('Peça ao administrador');
    expect(aviso.acao).toBeNull();
  });

  it('ambiente sem integração e motivo desconhecido: sem atalho, mesmo para admin', () => {
    expect(avisoPixIndisponivel('nao_configurado', { podeConectar: true })).toMatchObject({ acao: null });
    expect(avisoPixIndisponivel('nao_configurado').texto).toContain('neste ambiente');
    expect(avisoPixIndisponivel(undefined, { podeConectar: true })).toMatchObject({ acao: null });
    expect(avisoPixIndisponivel('qualquer').texto).toContain('indisponível no momento');
  });
});
