import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MercadoPagoPainel } from './MercadoPagoConexao.jsx';

const noop = () => {};

function render(props) {
  return renderToStaticMarkup(
    createElement(MercadoPagoPainel, { ocupado: false, onConectar: noop, onDesconectar: noop, ...props })
  );
}

describe('MercadoPagoPainel', () => {
  it('desconectado: oferece conectar', () => {
    const html = render({ estado: 'desconectado' });
    expect(html).toContain('Conectar Mercado Pago');
    expect(html).not.toContain('Desconectar');
  });

  it('conectado: mostra o estado e oferece desconectar', () => {
    const html = render({ estado: 'conectado', conectadoEm: '2026-10-27T12:00:00Z' });
    expect(html).toContain('Conectado');
    expect(html).toContain('Desconectar');
    expect(html).not.toContain('Conectar Mercado Pago');
  });

  it('não configurado: explica e mantém o Pix manual, sem botão', () => {
    const html = render({ estado: 'nao_configurado' });
    expect(html).toContain('não está habilitada');
    expect(html).toContain('manualmente');
    expect(html).not.toContain('<button');
  });

  it('mostra o erro do backend sem mascarar', () => {
    const html = render({ estado: 'desconectado', erro: 'A integração com o Mercado Pago não está configurada.' });
    expect(html).toContain('role="alert"');
    expect(html).toContain('A integração com o Mercado Pago não está configurada.');
  });

  it('ocupado desabilita o botão', () => {
    const html = render({ estado: 'desconectado', ocupado: true });
    expect(html).toContain('disabled');
    expect(html).toContain('Abrindo Mercado Pago');
  });
});
