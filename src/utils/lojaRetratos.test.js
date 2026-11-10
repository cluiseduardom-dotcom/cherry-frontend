import { describe, it, expect } from 'vitest';
import { avisoDeProporcao, dataBr, pendenciasDoRetrato, situacaoDoRetrato, tamanhoReduzido, validarTextos } from './lojaRetratos';

describe('situacaoDoRetrato', () => {
  it('ativo e autorizado aparece na Home', () => {
    expect(situacaoDoRetrato({ ativo: true, autorizacao_assinada: true })).toEqual({ rotulo: 'Aparece na Home', tom: 'ok' });
  });
  it('autorizado mas desligado', () => {
    expect(situacaoDoRetrato({ ativo: false, autorizacao_assinada: true }).tom).toBe('neutro');
  });
  it('sem autorização: aguardando (aviso)', () => {
    expect(situacaoDoRetrato({ ativo: false, autorizacao_assinada: false })).toEqual({ rotulo: 'Aguardando autorização', tom: 'aviso' });
  });
});

describe('pendenciasDoRetrato', () => {
  it('lista o que falta: autorização e descrição', () => {
    const p = pendenciasDoRetrato({ alt: null, autorizacao_assinada: false });
    expect(p).toHaveLength(2);
    expect(p.join(' ')).toMatch(/autorização/);
    expect(p.join(' ')).toMatch(/Descreva/);
  });
  it('usa a descrição digitada na tela (ainda não salva)', () => {
    expect(pendenciasDoRetrato({ alt: null, autorizacao_assinada: true }, { alt: 'Retrato de um homem' })).toEqual([]);
  });
  it('descrição só com espaços não vale', () => {
    expect(pendenciasDoRetrato({ alt: '   ', autorizacao_assinada: true })).toHaveLength(1);
  });
});

describe('validarTextos', () => {
  it('aceita vazio e normal', () => {
    expect(validarTextos({})).toBe('');
    expect(validarTextos({ alt: 'ok', nome: 'Fulano', ordem: '2' })).toBe('');
  });
  it('recusa texto longo e ordem inválida', () => {
    expect(validarTextos({ alt: 'x'.repeat(301) })).toMatch(/descrição/);
    expect(validarTextos({ nome: 'x'.repeat(121) })).toMatch(/nome/);
    expect(validarTextos({ ordem: '-1' })).toMatch(/inteiro/);
    expect(validarTextos({ ordem: '1.5' })).toMatch(/inteiro/);
  });
});

describe('tamanhoReduzido', () => {
  it('reduz mantendo a proporção até a altura máxima', () => {
    expect(tamanhoReduzido(3000, 4000, 1600)).toEqual({ largura: 1200, altura: 1600 });
  });
  it('nunca aumenta', () => {
    expect(tamanhoReduzido(800, 1421, 1600)).toEqual({ largura: 800, altura: 1421 });
  });
  it('medida inválida devolve zero', () => {
    expect(tamanhoReduzido(0, 100)).toEqual({ largura: 0, altura: 0 });
  });
});

describe('avisoDeProporcao', () => {
  it('foto vertical: sem aviso', () => {
    expect(avisoDeProporcao(900, 1600)).toBe('');
  });
  it('foto quadrada ou horizontal: avisa', () => {
    expect(avisoDeProporcao(1000, 1000)).toMatch(/vertical/);
    expect(avisoDeProporcao(1920, 1080)).toMatch(/vertical/);
  });
});

describe('dataBr', () => {
  it('formata a data e ignora lixo', () => {
    expect(dataBr('2026-11-10T12:00:00Z')).toMatch(/10\/11\/2026/);
    expect(dataBr(null)).toBe('');
    expect(dataBr('abc')).toBe('');
  });
});
