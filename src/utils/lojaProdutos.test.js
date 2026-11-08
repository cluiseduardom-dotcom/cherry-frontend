import { describe, it, expect } from 'vitest';
import { avisosDaPeca, formDaMarcacao, LIMITES, montarCorpo, situacaoDaPeca, validarForm } from './lojaProdutos';

const peca = (extra = {}) => ({ visivel: false, aparece_na_loja: false, preco_online: 100, saldo_central: 3, fotos: 2, ...extra });

describe('situacaoDaPeca', () => {
  it('na loja quando o backend diz que aparece', () => {
    expect(situacaoDaPeca(peca({ visivel: true, aparece_na_loja: true }))).toEqual({ rotulo: 'Na loja', tom: 'ok' });
  });
  it('marcada mas sem aparecer (falta preço): aviso', () => {
    expect(situacaoDaPeca(peca({ visivel: true, aparece_na_loja: false, preco_online: null })).tom).toBe('aviso');
  });
  it('não marcada: fora da loja', () => {
    expect(situacaoDaPeca(peca())).toEqual({ rotulo: 'Fora da loja', tom: 'neutro' });
  });
});

describe('avisosDaPeca', () => {
  it('peça completa não tem aviso', () => {
    expect(avisosDaPeca(peca({ visivel: true, aparece_na_loja: true }))).toEqual([]);
  });
  it('marcada sem preço online: avisa que não aparece', () => {
    const avisos = avisosDaPeca(peca({ visivel: true, preco_online: null }));
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(/não mostra/i);
  });
  it('não marcada e sem preço: pede o preço antes', () => {
    expect(avisosDaPeca(peca({ preco_online: null }))[0]).toMatch(/antes de mostrar/i);
  });
  it('sem estoque e sem foto: avisos separados, sem bloquear', () => {
    const avisos = avisosDaPeca(peca({ saldo_central: 0, fotos: 0 }));
    expect(avisos).toHaveLength(2);
    expect(avisos.join(' ')).toMatch(/indisponível/);
    expect(avisos.join(' ')).toMatch(/símbolo da marca/);
  });
});

describe('montarCorpo', () => {
  it('apara espaços, vazio vira null e ordem vira inteiro', () => {
    expect(montarCorpo({ titulo: '  Anel  ', descricao: '   ', materiais: '', cuidados: 'Evite água', ordem: ' 3 ' }))
      .toEqual({ titulo: 'Anel', descricao: null, materiais: null, cuidados: 'Evite água', ordem: 3 });
  });
  it('ordem vazia vira 0', () => {
    expect(montarCorpo({ ordem: '' }).ordem).toBe(0);
  });
  it('nunca inclui preço, custo, estoque nem empresa', () => {
    expect(Object.keys(montarCorpo({ titulo: 'x', preco: 1, custo: 2, empresa_id: 3 })).sort()).toEqual(['cuidados', 'descricao', 'materiais', 'ordem', 'titulo']);
  });
});

describe('validarForm', () => {
  it('aceita um formulário normal e vazio', () => {
    expect(validarForm({ titulo: 'Anel', ordem: '2' })).toBe('');
    expect(validarForm({})).toBe('');
  });
  it('recusa ordem que não é inteiro não negativo', () => {
    expect(validarForm({ ordem: '-1' })).toMatch(/inteiro/);
    expect(validarForm({ ordem: '1.5' })).toMatch(/inteiro/);
    expect(validarForm({ ordem: 'abc' })).toMatch(/inteiro/);
    expect(validarForm({ ordem: String(LIMITES.ordem + 1) })).toMatch(/no máximo/);
  });
  it('recusa texto acima do limite do backend', () => {
    expect(validarForm({ titulo: 'x'.repeat(LIMITES.titulo + 1) })).toMatch(/título/i);
    expect(validarForm({ descricao: 'x'.repeat(LIMITES.descricao + 1) })).toMatch(/descrição/i);
    expect(validarForm({ materiais: 'x'.repeat(LIMITES.materiais + 1) })).toMatch(/materiais/i);
    expect(validarForm({ cuidados: 'x'.repeat(LIMITES.cuidados + 1) })).toMatch(/cuidados/i);
    expect(validarForm({ titulo: 'x'.repeat(LIMITES.titulo) })).toBe('');
  });
});

describe('formDaMarcacao', () => {
  it('transforma null em texto vazio e ordem em texto', () => {
    expect(formDaMarcacao({ titulo: null, descricao: 'd', materiais: null, cuidados: null, ordem: 4 }))
      .toEqual({ titulo: '', descricao: 'd', materiais: '', cuidados: '', ordem: '4' });
  });
  it('sem marcação: tudo vazio e ordem 0', () => {
    expect(formDaMarcacao(undefined)).toEqual({ titulo: '', descricao: '', materiais: '', cuidados: '', ordem: '0' });
  });
});
