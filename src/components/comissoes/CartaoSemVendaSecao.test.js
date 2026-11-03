import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CartaoSemVendaTabela } from './CartaoSemVendaSecao.jsx';
import { rotuloCartaoPago } from '../../utils/pixDevolucao.js';

const item = { codigo: 'c15', valor: '5.50', criado_em: '2026-11-02T12:00:00Z', venda_id: null, situacao: 'sem_venda', metodo: 'cartao_link', tipo_cartao: 'credito', parcelas: 1 };

describe('CartaoSemVendaTabela', () => {
  it('lista o cartão sem venda e orienta a devolver no painel do Mercado Pago, sem botão de devolver', () => {
    const html = renderToStaticMarkup(createElement(CartaoSemVendaTabela, { items: [item], total: 1, valorTotal: '5.50' }));
    expect(html).toContain('Cartão recebido sem venda');
    expect(html).toContain('Sem venda concluída');
    expect(html).toContain('Crédito à vista');
    expect(html).toContain('painel do Mercado Pago');
    expect(html).not.toContain('Devolver</button>');
  });

  it('sem itens não renderiza nada', () => {
    expect(renderToStaticMarkup(createElement(CartaoSemVendaTabela, { items: [], total: 0, valorTotal: '0.00' }))).toBe('');
  });
});

describe('rotuloCartaoPago', () => {
  it.each([
    [{ tipo_cartao: 'credito', parcelas: 3 }, 'Crédito 3x'],
    [{ tipo_cartao: 'credito', parcelas: 1 }, 'Crédito à vista'],
    [{ tipo_cartao: 'debito', parcelas: 1 }, 'Débito'],
    [{}, 'Crédito à vista'],
  ])('%j -> %s', (item, esperado) => expect(rotuloCartaoPago(item)).toBe(esperado));
});
