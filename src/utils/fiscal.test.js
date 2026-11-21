import { describe, it, expect } from 'vitest';
import {
  dadosDoLote, mascararNcm, mudancasDaEmpresa, mudancasDoProduto, ncmValido, ORIGENS, pendenciasObrigatorias, rotuloDaOrigem, textoDoItem,
  validarCampoProduto, validarEmpresa, validarLote,
} from './fiscal';

describe('NCM', () => {
  it('máscara só para exibir', () => {
    expect(mascararNcm('71171900')).toBe('7117.19.00');
    expect(mascararNcm('123')).toBe('123');
    expect(mascararNcm(null)).toBe('');
  });

  it('valida a estrutura: 8 dígitos, capítulo 01 a 97 exceto 77; aceita a máscara', () => {
    expect(ncmValido('7117.19.00')).toBe(true);
    expect(ncmValido('71171900')).toBe(true);
    for (const ruim of ['', '1234567', '00000000', '77010000', '98010000', 'abcdefgh']) expect(ncmValido(ruim)).toBe(false);
  });
});

describe('origens', () => {
  it('as 9 origens existem, em ordem, e o rótulo cai em traço quando desconhecida', () => {
    expect(ORIGENS.map(o => o.valor)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(rotuloDaOrigem(0)).toBe('0 – Nacional');
    expect(rotuloDaOrigem(9)).toBe('—');
    expect(rotuloDaOrigem(null)).toBe('—');
  });
});

describe('validarCampoProduto', () => {
  it('vazio é válido (limpa); NCM, CEST e unidade conferem o formato', () => {
    expect(validarCampoProduto('ncm', '')).toBe('');
    expect(validarCampoProduto('ncm', '7117.19.00')).toBe('');
    expect(validarCampoProduto('ncm', '12')).toMatch(/NCM/);
    expect(validarCampoProduto('cest', '28.003.00')).toBe('');
    expect(validarCampoProduto('cest', '280')).toMatch(/CEST/);
    expect(validarCampoProduto('unidade_fiscal', 'kg')).toBe('');
    expect(validarCampoProduto('unidade_fiscal', 'UNIDADEX')).toMatch(/Unidade/);
  });
});

describe('mudancasDoProduto (só o que mudou)', () => {
  const original = { ncm: '71171900', cest: null, origem_mercadoria: 0, unidade_fiscal: 'UN' };

  it('sem mudança, corpo vazio', () => {
    expect(mudancasDoProduto(original, { ncm: '7117.19.00', cest: '', origem_mercadoria: '0', unidade_fiscal: 'un' })).toEqual({});
  });

  it('manda só os campos alterados, normalizados; vazio vira null', () => {
    expect(mudancasDoProduto(original, { ncm: '6203.42.00', cest: '28.003.00', origem_mercadoria: '1', unidade_fiscal: 'kg' })).toEqual({
      ncm: '62034200', cest: '2800300', origem_mercadoria: 1, unidade_fiscal: 'KG',
    });
    expect(mudancasDoProduto(original, { ncm: '', cest: '', origem_mercadoria: '', unidade_fiscal: 'UN' })).toEqual({ ncm: null, origem_mercadoria: null });
  });
});

describe('lote', () => {
  it('monta só o que foi preenchido, normalizado', () => {
    expect(dadosDoLote({ ncm: '7117.19.00', cest: '', origem_mercadoria: '0', unidade_fiscal: 'un' })).toEqual({ ncm: '71171900', origem_mercadoria: 0, unidade_fiscal: 'UN' });
    expect(dadosDoLote({ ncm: '', cest: '', origem_mercadoria: '', unidade_fiscal: '' })).toEqual({});
  });

  it('valida seleção (1 a 200), dados e formato', () => {
    expect(validarLote([], { ncm: '71171900' })).toMatch(/Selecione/);
    expect(validarLote(Array.from({ length: 201 }, (_, i) => i), { ncm: '71171900' })).toMatch(/200/);
    expect(validarLote([1], {})).toMatch(/ao menos um dado/);
    expect(validarLote([1], { ncm: '123' })).toMatch(/NCM/);
    expect(validarLote([1, 2], { ncm: '71171900', origem_mercadoria: 0 })).toBe('');
  });
});

describe('empresa', () => {
  const salvo = { regime_tributario: 'simples_nacional', inscricao_estadual: '123456789', inscricao_municipal: null, cnae_principal: '4781400', codigo_municipio_ibge: '3550308', ambiente: 'homologacao' };

  it('sem mudança, corpo vazio; com máscara equivalente também', () => {
    expect(mudancasDaEmpresa(salvo, { ...salvo, inscricao_estadual: '123.456.789', cnae_principal: '4781-4/00', inscricao_municipal: '' })).toEqual({});
  });

  it('envia o que mudou; vazio limpa; ISENTO em qualquer caixa', () => {
    expect(mudancasDaEmpresa(salvo, { ...salvo, regime_tributario: '', inscricao_estadual: 'isento', inscricao_municipal: 'IM-1', ambiente: 'producao' })).toEqual({
      regime_tributario: null, inscricao_estadual: 'ISENTO', inscricao_municipal: 'IM-1', ambiente: 'producao',
    });
  });

  it('valida IE, CNAE e município (vazio é válido)', () => {
    expect(validarEmpresa({ inscricao_estadual: '', cnae_principal: '', codigo_municipio_ibge: '' })).toBe('');
    expect(validarEmpresa({ inscricao_estadual: '1' })).toMatch(/Inscrição estadual/);
    expect(validarEmpresa({ inscricao_estadual: 'ISENTO' })).toBe('');
    expect(validarEmpresa({ cnae_principal: '123' })).toMatch(/CNAE/);
    expect(validarEmpresa({ codigo_municipio_ibge: '355' })).toMatch(/município/);
  });
});

describe('prontidão', () => {
  const prontidao = {
    grupos: [
      { id: 'empresa', itens: [{ id: 'cnpj', obrigatorio: true, ok: false, detalhe: 'CNPJ inválido' }, { id: 'cnae', obrigatorio: false, ok: false }] },
      { id: 'produtos', itens: [{ id: 'ncm', obrigatorio: true, ok: false, total: 4, preenchidos: 3, faltando: 1 }, { id: 'origem', obrigatorio: true, ok: true, total: 4, preenchidos: 4, faltando: 0 }] },
    ],
  };

  it('lista só as pendências obrigatórias', () => {
    expect(pendenciasObrigatorias(prontidao).map(i => i.id)).toEqual(['cnpj', 'ncm']);
    expect(pendenciasObrigatorias(null)).toEqual([]);
  });

  it('texto do item: contagem para produtos, detalhe para a empresa', () => {
    expect(textoDoItem(prontidao.grupos[1].itens[0])).toBe('3 de 4 produtos (faltam 1)');
    expect(textoDoItem(prontidao.grupos[1].itens[1])).toBe('Todos os 4 produtos');
    expect(textoDoItem(prontidao.grupos[0].itens[0])).toBe('CNPJ inválido');
    expect(textoDoItem({ ok: true })).toBe('Ok');
    expect(textoDoItem({ ok: false, detalhe: 'Recomendado' })).toBe('Não informado');
    expect(textoDoItem({ ok: false })).toBe('Não informado');
  });
});
