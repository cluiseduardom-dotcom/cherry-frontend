import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PixQrPainel } from './PixQrCobranca.jsx';
import PagamentoPDV from './PagamentoPDV.jsx';
import { calcularResumoPagamento } from '../utils/pagamentoVenda.js';

const noop = () => {};

describe('PixQrPainel', () => {
  it('mostra o QR, a validade e o botão de copiar', () => {
    const html = renderToStaticMarkup(createElement(PixQrPainel, {
      qrCode: '000201', qrCodeBase64: 'AAAA', restante: '29:05', copiado: false, onCopiar: noop,
    }));
    expect(html).toContain('data:image/png;base64,AAAA');
    expect(html).toContain('Aguardando o pagamento do cliente');
    expect(html).toContain('29:05');
    expect(html).toContain('Copiar código Pix');
  });

  it('sem código copia-e-cola não oferece o botão', () => {
    const html = renderToStaticMarkup(createElement(PixQrPainel, { qrCodeBase64: 'AAAA', copiado: false, onCopiar: noop }));
    expect(html).not.toContain('Copiar código Pix');
  });
});

describe('PagamentoPDV com Pix do Mercado Pago', () => {
  const render = (pagamentos) => renderToStaticMarkup(createElement(PagamentoPDV, {
    resumo: calcularResumoPagamento(50, pagamentos),
    pagamentos,
    temCliente: false,
    onAdicionar: noop,
    onConfirmarPendente: noop,
    onRecusarPendente: noop,
    onRemover: noop,
  }));

  it('Pix com cobrança aguarda sozinho: mostra o QR e não oferece confirmar à mão', () => {
    const html = render([{
      forma_pagamento: 'pix', valor: 50, numero_parcelas: 1, status: 'pendente',
      cobranca_codigo: 'abc', pix: { qr_code: '000201', qr_code_base64: 'AAAA', expira_em: '2099-01-01T00:00:00Z' },
    }]);
    expect(html).toContain('data:image/png;base64,AAAA');
    expect(html).not.toContain('Confirmar recebimento');
    expect(html).toContain('Aguardando pagamento');
  });

  it('Pix manual continua com Confirmar recebimento e sem QR', () => {
    const html = render([{ forma_pagamento: 'pix', valor: 50, numero_parcelas: 1, status: 'pendente' }]);
    expect(html).toContain('Confirmar recebimento');
    expect(html).not.toContain('data:image/png');
  });
});
