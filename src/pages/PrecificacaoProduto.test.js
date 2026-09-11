import { describe, it, expect } from 'vitest';
import {
  formatPercent,
  canalLabel,
  montarPayloadPreco,
  validarValorPreco,
} from './PrecificacaoProduto.jsx';

describe('formatPercent', () => {
  it('formata um número com 2 casas decimais e sufixo %', () => {
    expect(formatPercent(125)).toBe('125,00%');
    expect(formatPercent('55.56')).toBe('55,56%');
  });

  it('retorna travessão para null/undefined', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
  });
});

describe('canalLabel', () => {
  it('mapeia canais conhecidos', () => {
    expect(canalLabel('loja_fisica')).toBe('Loja física');
    expect(canalLabel('online')).toBe('Online');
  });

  it('usa o valor cru como fallback para canal desconhecido', () => {
    expect(canalLabel('marketplace')).toBe('marketplace');
  });
});

describe('montarPayloadPreco', () => {
  it('modo markup envia só markup_percentual', () => {
    const payload = montarPayloadPreco('markup', '125.5');
    expect(payload).toEqual({ markup_percentual: 125.5 });
    expect('preco_venda' in payload).toBe(false);
  });

  it('modo preco envia só preco_venda', () => {
    const payload = montarPayloadPreco('preco', '89.9');
    expect(payload).toEqual({ preco_venda: 89.9 });
    expect('markup_percentual' in payload).toBe(false);
  });
});

describe('validarValorPreco', () => {
  it('rejeita vazio', () => {
    expect(validarValorPreco('')).not.toBe('');
  });

  it('rejeita não numérico', () => {
    expect(validarValorPreco('abc')).not.toBe('');
  });

  it('rejeita zero ou negativo', () => {
    expect(validarValorPreco('0')).not.toBe('');
    expect(validarValorPreco('-5')).not.toBe('');
  });

  it('aceita número positivo', () => {
    expect(validarValorPreco('89.9')).toBe('');
  });
});
