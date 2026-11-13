import { describe, it, expect } from 'vitest';
import { CAMPOS_HOME_VENDAS } from '../services/lojaHomeVendas';
import { formDoHomeVendas, LIMITES_HOME, montarCorpoHomeVendas, PADROES_HOME, validarHomeVendas } from './lojaHomeVendas';

describe('formDoHomeVendas', () => {
  it('sem dados: desligado e textos vazios', () => {
    const form = formDoHomeVendas(undefined);

    expect(form.home_vendas_ativo).toBe(false);
    expect(form.home_presentes_titulo).toBe('');
    expect(Object.keys(form).sort()).toEqual([...CAMPOS_HOME_VENDAS].sort());
  });

  it('traz o que o backend devolveu, com null virando vazio', () => {
    const form = formDoHomeVendas({ home_vendas_ativo: true, home_presentes_titulo: 'Presente', home_ajuda_texto: null });

    expect(form.home_vendas_ativo).toBe(true);
    expect(form.home_presentes_titulo).toBe('Presente');
    expect(form.home_ajuda_texto).toBe('');
  });

  it('só `true` de verdade liga (texto "true" ou 1 não ligam)', () => {
    expect(formDoHomeVendas({ home_vendas_ativo: 'true' }).home_vendas_ativo).toBe(false);
    expect(formDoHomeVendas({ home_vendas_ativo: 1 }).home_vendas_ativo).toBe(false);
  });
});

describe('montarCorpoHomeVendas', () => {
  it('apara o texto, vazio vira null (volta ao padrão da loja) e a chave sai booleana', () => {
    const corpo = montarCorpoHomeVendas({ ...formDoHomeVendas({}), home_vendas_ativo: true, home_presentes_titulo: '  Presente para todo bolso ', home_ultimas_titulo: '   ' });

    expect(corpo.home_vendas_ativo).toBe(true);
    expect(corpo.home_presentes_titulo).toBe('Presente para todo bolso');
    expect(corpo.home_ultimas_titulo).toBeNull();
    expect(Object.keys(corpo).sort()).toEqual([...CAMPOS_HOME_VENDAS].sort());
  });
});

describe('validarHomeVendas', () => {
  it('aceita textos dentro do limite e recusa os longos demais', () => {
    expect(validarHomeVendas(formDoHomeVendas({}))).toBeNull();
    expect(validarHomeVendas({ ...formDoHomeVendas({}), home_presentes_titulo: 'x'.repeat(LIMITES_HOME.home_presentes_titulo) })).toBeNull();
    expect(validarHomeVendas({ ...formDoHomeVendas({}), home_presentes_titulo: 'x'.repeat(LIMITES_HOME.home_presentes_titulo + 1) })).toMatch(/80 caracteres/);
    expect(validarHomeVendas({ ...formDoHomeVendas({}), home_ajuda_texto: 'x'.repeat(201) })).toMatch(/200 caracteres/);
  });
});

describe('padrões de exemplo', () => {
  it('cada campo de texto tem um exemplo e ele cabe no limite', () => {
    for (const campo of Object.keys(LIMITES_HOME)) {
      expect(PADROES_HOME[campo]).toBeTruthy();
      expect(PADROES_HOME[campo].length).toBeLessThanOrEqual(LIMITES_HOME[campo]);
    }
  });
});
