import { describe, it, expect } from 'vitest';
import { esperaCritica, formatarTelefone, linkWhatsApp, resumoDosItens, tempoDesde } from './pedidosLoja';

describe('linkWhatsApp', () => {
  it('número brasileiro de 11 e de 10 dígitos ganha o 55', () => {
    expect(linkWhatsApp('11912345678')).toMatch(/^https:\/\/wa\.me\/5511912345678\?text=/);
    expect(linkWhatsApp('(11) 1234-5678')).toMatch(/^https:\/\/wa\.me\/551112345678\?text=/);
  });

  it('número que já vem com 55 não ganha outro', () => {
    expect(linkWhatsApp('5511912345678')).toMatch(/^https:\/\/wa\.me\/5511912345678\?text=/);
  });

  it.each([[''], [null], [undefined], ['123'], ['999999999999999'], ['abc']])('telefone %j não vira link', (telefone) => {
    expect(linkWhatsApp(telefone)).toBeNull();
  });

  it('a mensagem leva o código do pedido, codificada', () => {
    const url = linkWhatsApp('11912345678', '79DE7794');

    expect(decodeURIComponent(url.split('text=')[1])).toContain('79DE7794');
    expect(url).not.toContain(' ');
  });
});

describe('formatarTelefone', () => {
  it('formata 11 e 10 dígitos e devolve o resto como veio', () => {
    expect(formatarTelefone('11912345678')).toBe('(11) 91234-5678');
    expect(formatarTelefone('1112345678')).toBe('(11) 1234-5678');
    expect(formatarTelefone('+55 11 9')).toBe('+55 11 9');
    expect(formatarTelefone(null)).toBe('');
  });
});

describe('tempoDesde e esperaCritica', () => {
  const agora = new Date('2026-11-08T12:00:00Z').getTime();
  const antes = (min) => new Date(agora - min * 60000).toISOString();

  it.each([[0, 'agora há pouco'], [5, 'há 5 min'], [59, 'há 59 min'], [60, 'há 1 h'], [47 * 60, 'há 47 h'], [48 * 60, 'há 2 dias'], [72 * 60, 'há 3 dias']])('%i min → %s', (min, esperado) => {
    expect(tempoDesde(antes(min), agora)).toBe(esperado);
  });

  it('data inválida não quebra', () => {
    expect(tempoDesde('lixo', agora)).toBe('');
    expect(tempoDesde(null, agora)).toBe('');
    expect(tempoDesde(undefined, agora)).toBe('');
    expect(esperaCritica(null, agora)).toBe(false);
    expect(esperaCritica(undefined, agora)).toBe(false);
    expect(esperaCritica('', agora)).toBe(false);
  });

  it('crítica a partir de 24 horas', () => {
    expect(esperaCritica(antes(24 * 60 - 1), agora)).toBe(false);
    expect(esperaCritica(antes(24 * 60), agora)).toBe(true);
  });
});

describe('resumoDosItens', () => {
  it('uma linha com quantidade e nome; lista inválida vira vazio', () => {
    expect(resumoDosItens([{ nome: 'Brinco', quantidade: 2 }, { nome: 'Colar', quantidade: 1 }])).toBe('2 × Brinco, 1 × Colar');
    expect(resumoDosItens(null)).toBe('');
  });
});
