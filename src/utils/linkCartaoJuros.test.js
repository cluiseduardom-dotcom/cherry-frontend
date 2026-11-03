import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import PagamentoPDV from '../components/PagamentoPDV.jsx';
import { calcularResumoPagamento, pagamentosParaEnvio } from './pagamentoVenda';
import { confirmarLinkCartao, pagamentoComLinkCartao } from './pixGateway';

const aguardando = () => pagamentoComLinkCartao({ valor: 20, status: 'pendente' }, { codigo: 'c1', link_url: 'https://mp.exemplo/x', parcelas_maximas: 4, expira_em: null, expira_em_segundos: 7200 }, 1000);
const paga = { codigo: 'c1', tipo_cartao: 'credito', parcelas: 4, valor: '20.00', valor_total_pago: '22.27', juros_pagos: 2.27 };

describe('juros pago pelo cliente no link de cartão', () => {
  it('guarda total e juros só para a tela, sem mudar o valor da venda', () => {
    const [p] = confirmarLinkCartao([aguardando()], 0, paga);
    expect(p).toMatchObject({ forma_pagamento: 'credito', numero_parcelas: 4, valor: 20, status: 'confirmado', juros_cliente: { total: 22.27, juros: 2.27 } });
  });

  it('nunca envia juros_cliente para a API', () => {
    const [p] = confirmarLinkCartao([aguardando()], 0, paga);
    const [enviado] = pagamentosParaEnvio([p]);
    expect(enviado).not.toHaveProperty('juros_cliente');
    expect(enviado).not.toHaveProperty('status');
    expect(enviado.valor).toBe(20);
  });

  it.each([
    [{ ...paga, valor_total_pago: null, juros_pagos: null }],
    [{ ...paga, valor_total_pago: undefined, juros_pagos: undefined }],
    [{ ...paga, juros_pagos: 0 }],
    [{ ...paga, valor_total_pago: 'x', juros_pagos: 'y' }],
  ])('sem total válido ou sem juros, não mostra nada: %j', (cobranca) => {
    const [p] = confirmarLinkCartao([aguardando()], 0, cobranca);
    expect(p.juros_cliente).toBeUndefined();
  });

  it('a linha paga mostra "Cliente pagou" com o juro', () => {
    const pagamentos = confirmarLinkCartao([aguardando()], 0, paga);
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(PagamentoPDV, {
      resumo: calcularResumoPagamento(20, pagamentos), pagamentos, temCliente: false,
      onAdicionar: () => {}, onConfirmarPendente: () => {}, onRecusarPendente: () => {}, onRemover: () => {},
    })));
    expect(html).toContain('Cliente pagou');
    expect(html).toContain('22,27');
    expect(html).toContain('2,27');
  });
});
