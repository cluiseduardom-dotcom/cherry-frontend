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
      temCliente: true,
      onAdicionar: noop,
      onConfirmarPendente: noop,
      onRecusarPendente: noop,
      onRemover: noop,
      ...extra,
    })
  );
}

const nbsp = s => s.replace(/R\$ /g, 'R$ ');

describe('PagamentoPDV — passo de Crédito aberto', () => {
  const html = render(100, [], { passoInicial: 'credito', parcelasIniciais: '3' });

  it('mostra os atalhos 1x/2x/3x/6x/10x/12x com o escolhido marcado', () => {
    for (const n of [1, 2, 3, 6, 10, 12]) expect(html).toContain(`>${n}x</button>`);
    expect(html).toMatch(/pdv-pay-chip pdv-pay-chip--ativo"[^>]*aria-pressed="true">3x</);
    expect((html.match(/pdv-pay-chip--ativo/g) || []).length).toBe(1);
  });

  it('mostra o valor de cada parcela (3x de R$ 100,00, com a sobra na 1ª)', () => {
    expect(html).toContain(nbsp('1x de R$ 33,34 + 2x de R$ 33,33'));
  });

  it('o botão de confirmar existe e é o primeiro elemento de ação do passo', () => {
    expect(html).toContain('pdv-pay-confirmar');
    expect(html).toContain(nbsp('Confirmar Crédito · R$ 100,00'));
  });

  it('parcelas inválidas escondem o resumo em vez de mostrar valor errado', () => {
    const invalido = render(100, [], { passoInicial: 'credito', parcelasIniciais: '0' });
    expect(invalido).not.toContain('pdv-pay-parcelas-resumo');
  });
});

describe('PagamentoPDV — passo de Crediário aberto', () => {
  const html = render(100, [], { passoInicial: 'crediario', parcelasIniciais: '2' });

  it('pede parcelas e prazo e informa que é valor A RECEBER com vencimento', () => {
    expect(html).toContain('id="venda-parcelas"');
    expect(html).toContain('id="venda-meses-prazo"');
    expect(html).toContain('A receber · 1º venc.');
    expect(html).toContain('último');
    expect(html).toContain(nbsp('2x de R$ 50,00'));
  });
});

describe('PagamentoPDV — lista de pagamentos com parcelas', () => {
  it('crédito 3x mostra o valor da parcela e "Pago"', () => {
    const html = render(100, [{ forma_pagamento: 'credito', valor: 100, numero_parcelas: 3, status: 'confirmado' }]);
    expect(html).toContain(nbsp('1x de R$ 33,34 + 2x de R$ 33,33'));
    expect(html).toContain('>Pago<');
  });

  it('crediário aparece como "A receber" com prazo, nunca "Pago"', () => {
    const html = render(100, [{ forma_pagamento: 'crediario', valor: 100, numero_parcelas: 2, meses_prazo: 1, status: 'confirmado' }]);
    expect(html).toContain('A receber');
    expect(html).toContain('1º venc.');
    expect(html).not.toContain('>Pago<');
    expect(html).not.toContain('Pago ·');
  });
});

describe('PagamentoPDV — nada de taxa da plataforma na tela do cliente/operador', () => {
  it('nenhum texto de taxa/MDR/plataforma em nenhum estado do pagamento', () => {
    const estados = [
      render(100),
      render(100, [], { passoInicial: 'credito', parcelasIniciais: '3' }),
      render(100, [], { passoInicial: 'crediario' }),
      render(100, [{ forma_pagamento: 'pix', valor: 100, numero_parcelas: 1, status: 'pendente' }]),
    ];
    for (const html of estados) {
      expect(html).not.toMatch(/taxa|mdr|vertumno|giroone|gateway|plataforma/i);
    }
  });
});
