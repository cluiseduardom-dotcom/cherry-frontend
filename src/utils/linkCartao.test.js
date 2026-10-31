import { describe, it, expect } from 'vitest';
import {
  confirmacaoPerdaPix, confirmarLinkCartao, linkWhatsApp, pagamentoCartaoDoGateway, pagamentoComLinkCartao,
  pagamentoDoGateway, pagamentoLinkCartao, riscoPixGateway, situacaoLinkCartao,
} from './pixGateway';
import { calcularResumoPagamento, pagamentosParaEnvio, rotuloForma } from './pagamentoVenda';

const cobranca = { codigo: 'c1', link_url: 'https://mp.exemplo/x', parcelas_maximas: 12, expira_em: '2026-10-31T12:00:00Z', expira_em_segundos: 7200 };
const aguardando = () => pagamentoComLinkCartao({ valor: 120, status: 'pendente' }, cobranca, 1000);

describe('pagamentoComLinkCartao', () => {
  it('nasce como cartao_link pendente, ligado à cobrança, com os dados do link só para a tela', () => {
    const p = aguardando();
    expect(p).toMatchObject({ forma_pagamento: 'cartao_link', valor: 120, status: 'pendente', cobranca_codigo: 'c1', numero_parcelas: 1 });
    expect(p.link).toMatchObject({ url: 'https://mp.exemplo/x', parcelas_maximas: 12, recebido_em: 1000 });
    expect(pagamentoLinkCartao(p)).toBe(true);
    expect(pagamentoDoGateway(p)).toBe(true);
  });

  it('reserva o valor sem contar como pago e não deixa finalizar', () => {
    const resumo = calcularResumoPagamento(120, [aguardando()]);
    expect(resumo).toMatchObject({ pagoCentavos: 0, pendenteCentavos: 12000, alocavelCentavos: 0, podeFinalizar: false });
  });

  it('nunca vai para a API enquanto é cartao_link, nem se for marcado como confirmado por engano', () => {
    expect(pagamentosParaEnvio([aguardando(), { ...aguardando(), status: 'confirmado' }])).toEqual([]);
  });

  it('tem rótulo próprio', () => {
    expect(rotuloForma('cartao_link')).toBe('Link de cartão');
  });
});

describe('situacaoLinkCartao', () => {
  it('pago só vale com tipo de cartão lido do Mercado Pago', () => {
    expect(situacaoLinkCartao({ status: 'pago', tipo_cartao: 'credito', parcelas: 3 })).toBe('pago');
    expect(situacaoLinkCartao({ status: 'pago', tipo_cartao: 'debito', parcelas: 1 })).toBe('pago');
    expect(situacaoLinkCartao({ status: 'pago', tipo_cartao: null })).toBe('aguardando');
    expect(situacaoLinkCartao({ status: 'pago' })).toBe('aguardando');
  });

  it('pendente aguarda; expirada ou cancelada encerra', () => {
    expect(situacaoLinkCartao({ status: 'pendente', expirada: false })).toBe('aguardando');
    expect(situacaoLinkCartao({ status: 'pendente', expirada: true })).toBe('encerrada');
    expect(situacaoLinkCartao({ status: 'cancelado' })).toBe('encerrada');
    expect(situacaoLinkCartao(null)).toBe('aguardando');
  });
});

describe('confirmarLinkCartao', () => {
  it('crédito: vira crédito confirmado com as parcelas do Mercado Pago e sai do estado de link', () => {
    const [p] = confirmarLinkCartao([aguardando()], 0, { tipo_cartao: 'credito', parcelas: 3 });
    expect(p).toMatchObject({ forma_pagamento: 'credito', numero_parcelas: 3, status: 'confirmado', cobranca_codigo: 'c1', valor: 120 });
    expect(p.link).toBeUndefined();
    expect(pagamentosParaEnvio([p])).toEqual([{ forma_pagamento: 'credito', valor: 120, numero_parcelas: 3, cobranca_codigo: 'c1' }]);
    expect(calcularResumoPagamento(120, [p]).podeFinalizar).toBe(true);
  });

  it('débito: sempre 1 parcela', () => {
    const [p] = confirmarLinkCartao([aguardando()], 0, { tipo_cartao: 'debito', parcelas: 4 });
    expect(p).toMatchObject({ forma_pagamento: 'debito', numero_parcelas: 1, status: 'confirmado' });
  });

  it.each([
    [{ tipo_cartao: null, parcelas: 3 }],
    [{ tipo_cartao: 'pix', parcelas: 1 }],
    [{ tipo_cartao: 'credito', parcelas: 0 }],
    [{ tipo_cartao: 'credito', parcelas: 'x' }],
    [null],
  ])('dados incompletos %j não confirmam nada', (dados) => {
    const lista = [aguardando()];
    expect(confirmarLinkCartao(lista, 0, dados)).toBe(lista);
  });

  it('só age em link pendente e no índice certo', () => {
    const outro = { forma_pagamento: 'dinheiro', valor: 10, numero_parcelas: 1 };
    const lista = [outro, aguardando()];
    expect(confirmarLinkCartao(lista, 0, { tipo_cartao: 'credito', parcelas: 2 })).toBe(lista);
    const confirmada = confirmarLinkCartao(lista, 1, { tipo_cartao: 'credito', parcelas: 2 });
    expect(confirmada[0]).toBe(outro);
    expect(confirmarLinkCartao(confirmada, 1, { tipo_cartao: 'debito', parcelas: 1 })).toBe(confirmada);
  });
});

describe('proteção contra perda (cartão)', () => {
  it('link aguardando e cartão já pago contam como risco', () => {
    expect(riscoPixGateway([aguardando()])).toBe('aguardando');
    const [pago] = confirmarLinkCartao([aguardando()], 0, { tipo_cartao: 'credito', parcelas: 2 });
    expect(riscoPixGateway([pago])).toBe('pago');
    expect(pagamentoCartaoDoGateway(pago)).toBe(true);
    expect(pagamentoCartaoDoGateway({ forma_pagamento: 'pix', cobranca_codigo: 'x' })).toBe(false);
  });

  it('o texto de cartão fala de estorno no Mercado Pago, não de "Pix a devolver"', () => {
    const pago = confirmacaoPerdaPix('pago', 'limpar a venda', { cartao: true });
    const espera = confirmacaoPerdaPix('aguardando', 'limpar a venda', { cartao: true });
    for (const t of [pago, espera]) {
      expect(t.message).toContain('estorno no painel do Mercado Pago');
      expect(t.message).not.toContain('Pix a devolver');
    }
    expect(confirmacaoPerdaPix('pago', 'limpar a venda').message).toContain('Pix a devolver');
  });
});

describe('linkWhatsApp', () => {
  it('monta o link de envio com o valor e o endereço codificados', () => {
    const url = linkWhatsApp('https://mp.exemplo/x?a=1&b=2', 'R$ 120,00');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toBe('Link para pagar R$ 120,00 no cartão: https://mp.exemplo/x?a=1&b=2');
  });
});
