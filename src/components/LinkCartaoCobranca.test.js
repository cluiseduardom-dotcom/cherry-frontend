import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LinkCartaoPainel } from './LinkCartaoCobranca.jsx';
import PagamentoPDV from './PagamentoPDV.jsx';
import { calcularResumoPagamento } from '../utils/pagamentoVenda.js';
import { pagamentoComLinkCartao } from '../utils/pixGateway.js';

const noop = () => {};
const URL_LINK = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=abc';

describe('LinkCartaoPainel', () => {
  it('mostra o aguardo, a validade, o teto de parcelas e as três ações', () => {
    const html = renderToStaticMarkup(createElement(LinkCartaoPainel, {
      url: URL_LINK, valor: 120, parcelasMaximas: 12, restante: '119:30', copiado: false, onCopiar: noop,
    }));
    expect(html).toContain('Aguardando o cliente pagar no cartão');
    expect(html).toContain('119:30');
    expect(html).toContain('até 12x');
    expect(html).toContain('Copiar link');
    expect(html).toContain('Abrir link');
    expect(html).toContain('WhatsApp');
    expect(html).toContain(`href="${URL_LINK.replace('&', '&amp;')}"`);
    expect(html).toContain('https://wa.me/?text=');
  });

  it('depois de copiar, confirma na tela', () => {
    const html = renderToStaticMarkup(createElement(LinkCartaoPainel, { url: URL_LINK, valor: 10, copiado: true, onCopiar: noop }));
    expect(html).toContain('Link copiado');
  });

  it('sem link não oferece nenhuma ação', () => {
    const html = renderToStaticMarkup(createElement(LinkCartaoPainel, { valor: 10, copiado: false, onCopiar: noop }));
    expect(html).not.toContain('Copiar link');
    expect(html).not.toContain('Abrir link');
  });
});

describe('PagamentoPDV com link de cartão', () => {
  const render = (pagamentos, extras = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(PagamentoPDV, {
    resumo: calcularResumoPagamento(120, pagamentos),
    pagamentos,
    temCliente: false,
    onAdicionar: noop,
    onConfirmarPendente: noop,
    onRecusarPendente: noop,
    onRemover: noop,
    ...extras,
  })));

  const aguardando = pagamentoComLinkCartao(
    { valor: 120, status: 'pendente' },
    { codigo: 'c1', link_url: URL_LINK, parcelas_maximas: 12, expira_em: null, expira_em_segundos: 7200 },
    1000,
  );

  it('com Mercado Pago disponível oferece o botão "Link de cartão"; sem ele, não', () => {
    expect(render([], { criarLinkCartao: noop })).toContain('Link de cartão');
    expect(render([])).not.toContain('Link de cartão');
  });

  it('link aguardando mostra o link, não conta como pago e não oferece confirmar à mão', () => {
    const html = render([aguardando], { criarLinkCartao: noop });
    expect(html).toContain('Aguardando o cliente pagar no cartão');
    expect(html).toContain('Aguardando pagamento');
    expect(html).not.toContain('Confirmar recebimento');
    expect(html).not.toContain('Código copiado');
  });

  it('link já pago aparece como crédito com as parcelas do Mercado Pago', () => {
    const pago = { forma_pagamento: 'credito', valor: 120, numero_parcelas: 3, status: 'confirmado', cobranca_codigo: 'c1' };
    const html = render([pago]);
    expect(html).toContain('Crédito');
    expect(html).toContain('3x de');
    expect(html).toContain('Pago');
  });
});
