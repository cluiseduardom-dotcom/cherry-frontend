import { describe, it, expect } from 'vitest';
import { CAMPOS_CONDICOES } from '../services/lojaCondicoes';
import { formDasCondicoes, lerValorFrete, montarCorpoCondicoes, validarCondicoes } from './lojaCondicoes';

describe('lerValorFrete', () => {
  it('aceita ponto/vírgula, vazio vira null e lixo vira NaN', () => {
    expect(lerValorFrete('300')).toBe(300);
    expect(lerValorFrete('299,90')).toBe(299.9);
    expect(lerValorFrete(' 1.250,50 ')).toBe(1250.5);
    expect(lerValorFrete('')).toBeNull();
    expect(lerValorFrete(undefined)).toBeNull();
    expect(lerValorFrete('abc')).toBeNaN();
  });
});

describe('formDasCondicoes / montarCorpoCondicoes', () => {
  it('sem dados: tudo vazio, com as chaves do contrato', () => {
    const form = formDasCondicoes(undefined);

    expect(form).toEqual({ frete_gratis_acima: '', garantia_texto: '', embalagem_presente_texto: '' });
    expect(Object.keys(form).sort()).toEqual([...CAMPOS_CONDICOES].sort());
  });

  it('o número do backend vira texto com vírgula e volta como número', () => {
    const form = formDasCondicoes({ frete_gratis_acima: 299.9, garantia_texto: 'G', embalagem_presente_texto: null });

    expect(form.frete_gratis_acima).toBe('299,9');
    expect(montarCorpoCondicoes(form)).toEqual({ frete_gratis_acima: 299.9, garantia_texto: 'G', embalagem_presente_texto: null });
  });

  it('texto em branco e valor em branco viram null (a loja deixa de mostrar)', () => {
    expect(montarCorpoCondicoes({ frete_gratis_acima: '  ', garantia_texto: '   ', embalagem_presente_texto: '' }))
      .toEqual({ frete_gratis_acima: null, garantia_texto: null, embalagem_presente_texto: null });
  });
});

describe('validarCondicoes', () => {
  const ok = { frete_gratis_acima: '300', garantia_texto: '', embalagem_presente_texto: '' };

  it('aceita valor válido ou vazio', () => {
    expect(validarCondicoes(ok)).toBeNull();
    expect(validarCondicoes({ ...ok, frete_gratis_acima: '' })).toBeNull();
  });

  it('recusa zero, negativo, texto, valor enorme e textos longos', () => {
    for (const v of ['0', '-5', 'abc', '100001']) expect(validarCondicoes({ ...ok, frete_gratis_acima: v })).toMatch(/frete grátis/);
    expect(validarCondicoes({ ...ok, garantia_texto: 'x'.repeat(301) })).toMatch(/300 caracteres/);
    expect(validarCondicoes({ ...ok, embalagem_presente_texto: 'x'.repeat(201) })).toMatch(/200 caracteres/);
  });
});
