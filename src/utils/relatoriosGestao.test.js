import { describe, it, expect } from 'vitest';
import {
  atalhosDePeriodo,
  contarVendas,
  descreverCobertura,
  descreverVariacao,
  formatarPercentual,
  larguraDaBarra,
  maximoDasBarras,
  rotuloDiaSemana,
  rotuloFormaPagamento,
  temCusto,
  validarPeriodo,
} from './relatoriosGestao';

describe('validarPeriodo', () => {
  it('aceita período válido', () => {
    expect(validarPeriodo('2026-03-01', '2026-03-31')).toBe('');
    expect(validarPeriodo('2026-03-01', '2026-03-01')).toBe('');
  });

  it('recusa datas ausentes, mal formadas ou invertidas', () => {
    expect(validarPeriodo('', '2026-03-01')).toMatch(/duas datas/);
    expect(validarPeriodo('01/03/2026', '2026-03-01')).toMatch(/duas datas/);
    expect(validarPeriodo('2026-03-31', '2026-03-01')).toMatch(/depois/);
  });

  it('recusa mais de 731 dias, como o backend', () => {
    expect(validarPeriodo('2024-01-01', '2025-12-31')).toBe('');
    expect(validarPeriodo('2024-01-01', '2026-01-02')).toMatch(/731/);
  });
});

describe('atalhosDePeriodo', () => {
  const hoje = new Date(2026, 10, 21); // 21/11/2026
  const por = Object.fromEntries(atalhosDePeriodo(hoje).map(a => [a.chave, a]));

  it('7, 30 e 90 dias contam o dia de hoje', () => {
    expect(por['7']).toMatchObject({ inicio: '2026-11-15', fim: '2026-11-21' });
    expect(por['30']).toMatchObject({ inicio: '2026-10-23', fim: '2026-11-21' });
    expect(por['90']).toMatchObject({ inicio: '2026-08-24', fim: '2026-11-21' });
  });

  it('este mês começa no dia 1', () => {
    expect(por.mes).toMatchObject({ inicio: '2026-11-01', fim: '2026-11-21' });
  });

  it('todos os atalhos passam na validação do período', () => {
    for (const a of atalhosDePeriodo(hoje)) expect(validarPeriodo(a.inicio, a.fim)).toBe('');
  });
});

describe('descreverVariacao', () => {
  it('sinal, tom e vírgula decimal', () => {
    expect(descreverVariacao(10)).toEqual({ texto: '+10%', tom: 'positivo' });
    expect(descreverVariacao(-12.5)).toEqual({ texto: '-12,5%', tom: 'negativo' });
    expect(descreverVariacao(0)).toEqual({ texto: '0%', tom: 'neutro' });
  });

  it('sem base de comparação mostra traço, nunca NaN', () => {
    for (const vazio of [null, undefined, NaN, 'abc']) {
      expect(descreverVariacao(vazio)).toEqual({ texto: '—', tom: 'neutro' });
    }
  });
});

describe('formatadores', () => {
  it('percentual e cobertura', () => {
    expect(formatarPercentual(59.26)).toBe('59,26%');
    expect(formatarPercentual(null)).toBe('—');
    expect(descreverCobertura(51.7)).toBe('52 dias');
    expect(descreverCobertura(null)).toBe('Sem venda no período');
    expect(descreverCobertura(900)).toBe('Mais de 1 ano');
  });

  it('plural de vendas', () => {
    expect(contarVendas(0)).toBe('0 vendas');
    expect(contarVendas(1)).toBe('1 venda');
    expect(contarVendas(2)).toBe('2 vendas');
    expect(contarVendas(undefined)).toBe('0 vendas');
  });

  it('rótulos conhecidos e desconhecidos', () => {
    expect(rotuloFormaPagamento('pix')).toBe('Pix');
    expect(rotuloFormaPagamento('crediario')).toBe('Crediário');
    expect(rotuloFormaPagamento('vale')).toBe('vale');
    expect(rotuloDiaSemana(0)).toBe('Domingo');
    expect(rotuloDiaSemana(6)).toBe('Sábado');
    expect(rotuloDiaSemana(9)).toBe('—');
  });
});

describe('temCusto', () => {
  it('detecta o campo mesmo quando o valor é zero', () => {
    expect(temCusto({ custo: 0 })).toBe(true);
    expect(temCusto({ receita: 10 })).toBe(false);
    expect(temCusto(null)).toBe(false);
  });
});

describe('barras', () => {
  it('máximo nunca é zero e a largura fica entre 0 e 100', () => {
    expect(maximoDasBarras([], 'valor')).toBe(1);
    expect(maximoDasBarras([{ valor: 0 }], 'valor')).toBe(1);
    expect(maximoDasBarras([{ valor: 5 }, { valor: 20 }], 'valor')).toBe(20);
    expect(larguraDaBarra(5, 20)).toBe(25);
    expect(larguraDaBarra(50, 20)).toBe(100);
    expect(larguraDaBarra(-1, 20)).toBe(0);
    expect(larguraDaBarra(5, 0)).toBe(0);
  });
});
