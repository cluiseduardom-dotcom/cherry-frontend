import { describe, it, expect } from 'vitest';
import {
  categoriasDaVariacao,
  chaveDaCombinacao,
  combinacoesNovas,
  combinar,
  lerValores,
  montarCorpoGrade,
  nomeDaVariacao,
  resumoDeEstoque,
  validarNovaGrade,
} from './grades';

describe('lerValores', () => {
  it('separa por vírgula, ponto e vírgula ou linha; tira vazios e repetidos (sem diferenciar maiúsculas)', () => {
    expect(lerValores('P, M, G')).toEqual(['P', 'M', 'G']);
    expect(lerValores('P\nM\n\nG')).toEqual(['P', 'M', 'G']);
    expect(lerValores('Azul; azul, AZUL , Vermelha')).toEqual(['Azul', 'Vermelha']);
    expect(lerValores('')).toEqual([]);
    expect(lerValores(null)).toEqual([]);
  });
});

describe('combinar', () => {
  it('produto cartesiano na ordem dos eixos', () => {
    const r = combinar([{ nome: 'Tamanho', valores: ['P', 'M'] }, { nome: 'Cor', valores: ['Azul', 'Preta'] }]);
    expect(r).toEqual([
      { Tamanho: 'P', Cor: 'Azul' }, { Tamanho: 'P', Cor: 'Preta' },
      { Tamanho: 'M', Cor: 'Azul' }, { Tamanho: 'M', Cor: 'Preta' },
    ]);
  });

  it('um eixo só; nenhum eixo devolve a combinação vazia', () => {
    expect(combinar([{ nome: 'Cor', valores: ['A', 'B'] }])).toEqual([{ Cor: 'A' }, { Cor: 'B' }]);
    expect(combinar([])).toEqual([{}]);
  });
});

describe('nome e chave da variação', () => {
  it('nome igual ao do backend: grade + valores separados por barra', () => {
    expect(nomeDaVariacao(' Camiseta ', ['Tamanho', 'Cor'], { Tamanho: 'P', Cor: 'Azul' })).toBe('Camiseta P / Azul');
  });

  it('a chave ignora maiúsculas e espaços', () => {
    expect(chaveDaCombinacao(['Tamanho'], { Tamanho: ' P ' })).toBe(chaveDaCombinacao(['Tamanho'], { Tamanho: 'p' }));
  });
});

describe('validarNovaGrade', () => {
  const ok = { nome: 'Camiseta', custo: '20', preco_venda: '', eixos: [{ nome: 'Tamanho', valoresTexto: 'P, M' }] };

  it('aceita grade válida', () => {
    expect(validarNovaGrade(ok, 2)).toBe('');
    expect(validarNovaGrade({ ...ok, preco_venda: '59.9' }, 2)).toBe('');
  });

  it('recusa nome, custo, preço, eixos e valores inválidos', () => {
    expect(validarNovaGrade({ ...ok, nome: ' ' }, 2)).toMatch(/nome/i);
    for (const custo of ['', '0', '-1', 'abc']) expect(validarNovaGrade({ ...ok, custo }, 2)).toMatch(/custo/i);
    expect(validarNovaGrade({ ...ok, preco_venda: '0' }, 2)).toMatch(/preço/i);
    expect(validarNovaGrade({ ...ok, eixos: [] }, 2)).toMatch(/eixo/i);
    expect(validarNovaGrade({ ...ok, eixos: [{ nome: '', valoresTexto: 'P' }] }, 2)).toMatch(/nome a cada eixo/i);
    expect(validarNovaGrade({ ...ok, eixos: [{ nome: 'Cor', valoresTexto: 'A' }, { nome: 'cor', valoresTexto: 'B' }] }, 2)).toMatch(/repetido/i);
    expect(validarNovaGrade({ ...ok, eixos: [{ nome: 'Tamanho', valoresTexto: ' , ' }] }, 2)).toMatch(/valores/i);
    expect(validarNovaGrade({ ...ok, eixos: [1, 2, 3, 4].map(i => ({ nome: `E${i}`, valoresTexto: 'x' })) }, 2)).toMatch(/No máximo 3/);
    expect(validarNovaGrade({ ...ok, eixos: [{ nome: 'T', valoresTexto: 'x'.repeat(41) }] }, 2)).toMatch(/40/);
  });

  it('exige de 1 a 100 variações selecionadas', () => {
    expect(validarNovaGrade(ok, 0)).toMatch(/ao menos uma/);
    expect(validarNovaGrade(ok, 101)).toMatch(/100/);
  });
});

describe('categoriasDaVariacao', () => {
  const niveis = [{ nivel: 1, nome: 'Tipo' }, { nivel: 2, nome: 'Tamanho' }];
  const categorias = [
    { id: 10, nivel: 1, nome: 'Camisetas' },
    { id: 21, nivel: 2, nome: 'P' },
    { id: 22, nivel: 2, nome: 'M' },
  ];

  it('eixo com o nome de um nível escolhe a categoria de mesmo nome', () => {
    expect(categoriasDaVariacao({ Tamanho: 'P', Cor: 'Azul' }, niveis, categorias)).toEqual({ categoriaIds: [21], semCategoria: [] });
    expect(categoriasDaVariacao({ Tamanho: 'm' }, niveis, categorias).categoriaIds).toEqual([22]);
  });

  it('valor sem categoria é avisado; eixo sem nível correspondente é ignorado', () => {
    expect(categoriasDaVariacao({ Tamanho: 'GG' }, niveis, categorias)).toEqual({ categoriaIds: [], semCategoria: [{ eixo: 'Tamanho', valor: 'GG' }] });
    expect(categoriasDaVariacao({ Cor: 'Azul' }, niveis, categorias)).toEqual({ categoriaIds: [], semCategoria: [] });
  });
});

describe('montarCorpoGrade', () => {
  const niveis = [{ nivel: 2, nome: 'Tamanho' }];
  const categorias = [{ id: 21, nivel: 2, nome: 'P' }];
  const form = { nome: ' Camiseta ', descricao: '', custo: '20', preco_venda: '59.9', eixos: [{ nome: 'Tamanho' }, { nome: 'Cor' }], categoriaComumIds: [10] };

  it('monta o contrato do backend, mapeando categorias e omitindo o que está vazio', () => {
    const corpo = montarCorpoGrade(form, [{ Tamanho: 'P', Cor: 'Azul' }, { Tamanho: 'GG', Cor: 'Azul' }], niveis, categorias);
    expect(corpo).toEqual({
      nome: 'Camiseta',
      eixos: ['Tamanho', 'Cor'],
      custo: 20,
      preco_venda: 59.9,
      categoria_ids: [10],
      variacoes: [
        { valores: { Tamanho: 'P', Cor: 'Azul' }, categoria_ids: [21] },
        { valores: { Tamanho: 'GG', Cor: 'Azul' } },
      ],
    });
  });

  it('sem preço, sem descrição e sem categoria comum, esses campos não vão', () => {
    const corpo = montarCorpoGrade({ ...form, preco_venda: '', categoriaComumIds: [] }, [{ Tamanho: 'P', Cor: 'A' }], niveis, categorias);
    expect(corpo).not.toHaveProperty('preco_venda');
    expect(corpo).not.toHaveProperty('descricao');
    expect(corpo).not.toHaveProperty('categoria_ids');
  });
});

describe('combinacoesNovas (acrescentar a uma grade existente)', () => {
  it('tira as combinações que já existem, sem diferenciar maiúsculas', () => {
    const existentes = [{ variacao: { Tamanho: 'P', Cor: 'Azul' } }, { variacao: { Tamanho: 'M', Cor: 'Azul' } }];
    const novas = combinacoesNovas(['Tamanho', 'Cor'], [['p', 'G'], ['AZUL', 'Preta']], existentes);
    expect(novas).toEqual([{ Tamanho: 'p', Cor: 'Preta' }, { Tamanho: 'G', Cor: 'AZUL' }, { Tamanho: 'G', Cor: 'Preta' }]);
  });
});

describe('resumoDeEstoque', () => {
  it('soma o estoque e conta as variações zeradas', () => {
    expect(resumoDeEstoque([{ estoque_atual: 5 }, { estoque_atual: 0 }, { estoque_atual: 2 }])).toEqual({ total: 7, semEstoque: 1 });
    expect(resumoDeEstoque([])).toEqual({ total: 0, semEstoque: 0 });
  });
});
