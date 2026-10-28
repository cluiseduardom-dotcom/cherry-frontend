import { describe, it, expect } from 'vitest';
import { lerResultadoMercadoPago, urlAutorizacaoValida, estadoMercadoPago } from './mercadoPago';

describe('lerResultadoMercadoPago', () => {
  it('aceita só conectado e erro', () => {
    expect(lerResultadoMercadoPago('?mercadopago=conectado')).toBe('conectado');
    expect(lerResultadoMercadoPago('?mercadopago=erro')).toBe('erro');
    expect(lerResultadoMercadoPago('?mercadopago=qualquer')).toBe(null);
    expect(lerResultadoMercadoPago('')).toBe(null);
    expect(lerResultadoMercadoPago(undefined)).toBe(null);
  });
});

describe('urlAutorizacaoValida', () => {
  it('aceita https do Mercado Pago', () => {
    expect(urlAutorizacaoValida('https://auth.mercadopago.com/authorization?client_id=1')).toBe(true);
    expect(urlAutorizacaoValida('https://auth.mercadopago.com.br/authorization?client_id=1')).toBe(true);
  });

  it('recusa outros destinos', () => {
    expect(urlAutorizacaoValida('http://auth.mercadopago.com/authorization')).toBe(false);
    expect(urlAutorizacaoValida('https://mercadopago.com.evil.com/x')).toBe(false);
    expect(urlAutorizacaoValida('https://evilmercadopago.com/x')).toBe(false);
    expect(urlAutorizacaoValida('javascript:alert(1)')).toBe(false);
    expect(urlAutorizacaoValida('')).toBe(false);
    expect(urlAutorizacaoValida(undefined)).toBe(false);
  });
});

describe('estadoMercadoPago', () => {
  it('resume o status da API', () => {
    expect(estadoMercadoPago(null)).toBe('indisponivel');
    expect(estadoMercadoPago({ configurado: false, conectado: false })).toBe('nao_configurado');
    expect(estadoMercadoPago({ configurado: true, conectado: false })).toBe('desconectado');
    expect(estadoMercadoPago({ configurado: true, conectado: true })).toBe('conectado');
  });
});
