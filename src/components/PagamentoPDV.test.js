import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PagamentoPDV from './PagamentoPDV.jsx';
import { calcularResumoPagamento } from '../utils/pagamentoVenda.js';

const noop = () => {};

function render(total, pagamentos = [], extra = {}) {
  return renderToStaticMarkup(
    createElement(PagamentoPDV, {
      resumo: calcularResumoPagamento(total, pagamentos),
      pagamentos,
      temCliente: false,
      onAdicionar: noop,
      onConfirmarPendente: noop,
      onRecusarPendente: noop,
      onRemover: noop,
      ...extra,
    })
  );
}

// toContain com texto que o Intl formata com espaço não separável (R$ 50,00)
const nbsp = s => s.replace(/R\$ /g, 'R$ ');

describe('PagamentoPDV — venda R$ 50,00 sem pagamentos', () => {
  const html = render(50);

  it('mostra Total e Restante em destaque', () => {
    expect(html).toContain('pdv-pay-hero');
    expect(html).toContain('Total');
    expect(html).toContain('Restante');
    expect(html).toContain(nbsp('R$ 50,00'));
  });

  it('o campo de valor já começa com o saldo restante (50,00)', () => {
    expect(html).toMatch(/id="venda-valor-pagamento"[^>]*value="50,00"/);
  });

  it('as formas são botões grandes (não um select) e a pergunta está visível', () => {
    expect(html).toContain('Como o cliente vai pagar?');
    expect(html).not.toContain('<select');
    for (const rotulo of ['PIX', 'Débito', 'Crédito', 'Dinheiro', 'Crediário']) {
      expect(html).toContain(`<span>${rotulo}</span>`);
    }
    expect((html.match(/class="pdv-pay-forma /g) || []).length).toBe(5);
  });

  it('não há botão "Adicionar" nem "Usar saldo" (um toque na forma registra)', () => {
    expect(html).not.toContain('Usar saldo');
    expect(html).not.toMatch(/>\s*Adicionar\s*</);
  });
});

describe('PagamentoPDV — PIX parcial já confirmado', () => {
  const html = render(50, [{ forma_pagamento: 'pix', valor: 25, numero_parcelas: 1, status: 'confirmado' }]);

  it('restante 25 e valor do próximo pagamento já em 25,00', () => {
    expect(html).toContain(nbsp('R$ 25,00'));
    expect(html).toMatch(/id="venda-valor-pagamento"[^>]*value="25,00"/);
    expect(html).toContain('Valor do próximo pagamento');
  });

  it('lista o pagamento como Pago', () => {
    expect(html).toContain('Pagamentos realizados');
    expect(html).toContain('pdv-pay-item--confirmado');
    expect(html).toContain('>Pago<');
  });
});

describe('PagamentoPDV — PIX aguardando pagamento', () => {
  const html = render(50, [{ forma_pagamento: 'pix', valor: 25, numero_parcelas: 1, status: 'pendente' }]);

  it('mostra "Aguardando pagamento" com ações de confirmar e recusar', () => {
    expect(html).toContain('pdv-pay-item--pendente');
    expect(html).toContain('Aguardando pagamento');
    expect(html).toContain('Confirmar recebimento');
    expect(html).toContain('Recusado');
  });

  it('o restante continua 50 (não reduziu) e o próximo valor reserva os 25 do PIX', () => {
    expect(html).toContain('pdv-pay-hero--falta');
    expect(html).toContain(nbsp('R$ 50,00'));
    expect(html).toMatch(/id="venda-valor-pagamento"[^>]*value="25,00"/);
    expect(html).toContain('ainda não conta como pago');
  });
});

describe('PagamentoPDV — pagamento recusado', () => {
  const html = render(50, [{ forma_pagamento: 'pix', valor: 50, numero_parcelas: 1, status: 'recusado' }]);

  it('mostra o estado Recusado e volta a aceitar o valor cheio', () => {
    expect(html).toContain('pdv-pay-item--recusado');
    expect(html).toContain('>Recusado<');
    expect(html).toMatch(/id="venda-valor-pagamento"[^>]*value="50,00"/);
  });
});

describe('PagamentoPDV — pagamento completo', () => {
  const html = render(50, [
    { forma_pagamento: 'pix', valor: 25, numero_parcelas: 1, status: 'confirmado' },
    { forma_pagamento: 'debito', valor: 25, numero_parcelas: 1, status: 'confirmado' },
  ]);

  it('mostra "Pagamento completo" e impede novos pagamentos', () => {
    expect(html).toContain('Pagamento completo');
    expect(html).toContain('pdv-pay-hero--ok');
    expect(html).not.toContain('Como o cliente vai pagar?');
    expect(html).not.toContain('venda-valor-pagamento');
  });

  it('lista os dois pagamentos realizados', () => {
    expect((html.match(/pdv-pay-item--confirmado/g) || []).length).toBe(2);
  });
});

describe('PagamentoPDV — dinheiro com troco já registrado', () => {
  const html = render(50, [
    { forma_pagamento: 'dinheiro', valor: 50, valor_recebido: 100, numero_parcelas: 1, status: 'confirmado' },
  ]);

  it('mostra recebido e troco na linha do pagamento', () => {
    expect(html).toContain(nbsp('Recebido R$ 100,00'));
    expect(html).toContain(nbsp('Troco R$ 50,00'));
    expect(html).toContain('Pagamento completo');
  });
});

describe('PagamentoPDV — ordem e densidade (ajustes pós validação visual)', () => {
  it('pagamento aguardando aparece ACIMA dos cards de forma, com o botão de confirmar à vista', () => {
    const html = render(50, [{ forma_pagamento: 'pix', valor: 25, numero_parcelas: 1, status: 'pendente' }]);
    const iPendente = html.indexOf('Confirmar recebimento');
    const iCards = html.indexOf('Como o cliente vai pagar?');
    expect(iPendente).toBeGreaterThan(-1);
    expect(iCards).toBeGreaterThan(-1);
    expect(iPendente).toBeLessThan(iCards);
    // e não aparece de novo na lista de realizados
    expect(html).not.toContain('Pagamentos realizados');
    expect((html.match(/Confirmar recebimento/g) || []).length).toBe(1);
  });

  it('pagos continuam em "Pagamentos realizados", abaixo dos cards', () => {
    const html = render(50, [
      { forma_pagamento: 'pix', valor: 10, numero_parcelas: 1, status: 'confirmado' },
      { forma_pagamento: 'pix', valor: 15, numero_parcelas: 1, status: 'pendente' },
    ]);
    expect(html.indexOf('Pagamentos realizados')).toBeGreaterThan(html.indexOf('Como o cliente vai pagar?'));
    expect(html.indexOf('Aguardando confirmação')).toBeLessThan(html.indexOf('Como o cliente vai pagar?'));
  });

  it('pagamento completo não repete a faixa verde "nenhum novo pagamento" (já está no hero e no rodapé)', () => {
    const html = render(50, [{ forma_pagamento: 'debito', valor: 50, numero_parcelas: 1, status: 'confirmado' }]);
    expect(html).toContain('Pagamento completo');
    expect(html).not.toContain('nenhum novo pagamento');
    expect((html.match(/Pagamento completo/g) || []).length).toBe(1);
  });
});
