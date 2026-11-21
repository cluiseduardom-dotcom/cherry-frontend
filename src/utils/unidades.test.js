import { describe, it, expect } from 'vitest';
import {
  custoParaEnvio,
  custoParaExibicao,
  ehUnidadeBase,
  formatarQuantidade,
  lerDecimal,
  montarItensDaFicha,
  opcoesDeEntrada,
  paraCampoDeEntrada,
  paraUnidadeBase,
  rotuloDoCusto,
  validarRendimento,
} from './unidades';

describe('unidades-base', () => {
  it('só G e ML são unidade-base; kg e L não existem no banco', () => {
    expect(ehUnidadeBase('G')).toBe(true);
    expect(ehUnidadeBase('ML')).toBe(true);
    for (const u of ['UN', 'PAR', 'KG', 'L', undefined]) expect(ehUnidadeBase(u)).toBe(false);
    expect(opcoesDeEntrada('G').map(o => o.rotulo)).toEqual(['g', 'kg']);
    expect(opcoesDeEntrada('ML').map(o => o.rotulo)).toEqual(['ml', 'L']);
    expect(opcoesDeEntrada('UN')).toBeNull();
  });
});

describe('lerDecimal', () => {
  it('aceita vírgula e ponto; vazio e lixo viram NaN', () => {
    expect(lerDecimal('0,25')).toBe(0.25);
    expect(lerDecimal('0.25')).toBe(0.25);
    expect(lerDecimal(' 12 ')).toBe(12);
    expect(lerDecimal('1.250,5')).toBe(1250.5);
    for (const ruim of ['', 'abc', '1,2,3', '-1', null, undefined]) expect(lerDecimal(ruim)).toBeNaN();
  });
});

describe('paraUnidadeBase (sempre inteiro)', () => {
  it('g e kg viram gramas inteiros, sem erro de ponto flutuante', () => {
    expect(paraUnidadeBase('250', 'G', 'base')).toEqual({ valor: 250, erro: '' });
    expect(paraUnidadeBase('0,25', 'G', 'grande')).toEqual({ valor: 250, erro: '' });
    expect(paraUnidadeBase('0,35', 'G', 'grande')).toEqual({ valor: 350, erro: '' }); // 0,35 × 1000 = 350,00000000000006 em float
    expect(paraUnidadeBase('1,5', 'ML', 'grande')).toEqual({ valor: 1500, erro: '' });
  });

  it('recusa o que não vira inteiro e o que é zero', () => {
    expect(paraUnidadeBase('0,0005', 'G', 'grande').erro).toMatch(/3 casas/);
    expect(paraUnidadeBase('1,5', 'G', 'base').erro).toMatch(/3 casas/);
    expect(paraUnidadeBase('0', 'G', 'base').erro).toMatch(/maior que zero/);
    expect(paraUnidadeBase('abc', 'G', 'base').erro).toMatch(/válida/);
  });

  it('unidade comum só aceita inteiro e ignora a escolha de kg', () => {
    expect(paraUnidadeBase('3', 'UN', 'grande')).toEqual({ valor: 3, erro: '' });
    expect(paraUnidadeBase('2,5', 'UN').erro).toMatch(/inteiras/);
  });
});

describe('paraCampoDeEntrada e formatarQuantidade', () => {
  it('mostra em kg quando fica redondo; senão em g', () => {
    expect(paraCampoDeEntrada(1250, 'G')).toEqual({ texto: '1,25', escolha: 'grande' });
    expect(paraCampoDeEntrada(2000, 'G')).toEqual({ texto: '2', escolha: 'grande' });
    expect(paraCampoDeEntrada(1234, 'G')).toEqual({ texto: '1234', escolha: 'base' });
    expect(paraCampoDeEntrada(250, 'G')).toEqual({ texto: '250', escolha: 'base' });
    expect(paraCampoDeEntrada(5, 'UN')).toEqual({ texto: '5', escolha: 'base' });
  });

  it('formata com a unidade certa', () => {
    expect(formatarQuantidade(250, 'G')).toBe('250 g');
    expect(formatarQuantidade(1250, 'G')).toBe('1,25 kg');
    expect(formatarQuantidade(300, 'ML')).toBe('300 ml');
    expect(formatarQuantidade(2000, 'ML')).toBe('2 L');
    expect(formatarQuantidade(12, 'UN')).toBe('12');
    expect(formatarQuantidade(12, undefined)).toBe('12');
    expect(formatarQuantidade(3, 'CX')).toBe('3 CX');
    expect(formatarQuantidade('x', 'G')).toBe('—');
  });
});

describe('custo por kg × por grama', () => {
  it('a pessoa digita R$ 12,50/kg e o banco guarda 0,0125 por g', () => {
    expect(custoParaEnvio('12.5', 'G')).toBe(0.0125);
    expect(custoParaEnvio('8', 'ML')).toBe(0.008);
    expect(custoParaEnvio('12.5', 'UN')).toBe(12.5);
    expect(custoParaExibicao('0.0125', 'G')).toBe('12.5');
    expect(custoParaExibicao('12.50', 'UN')).toBe('12.5');
    expect(custoParaExibicao('', 'G')).toBe('');
  });

  it('ida e volta não perde precisão', () => {
    for (const exibido of ['12.5', '7.99', '0.4', '120']) {
      expect(custoParaExibicao(custoParaEnvio(exibido, 'G'), 'G')).toBe(String(Number(exibido)));
    }
  });

  it('rótulo do campo', () => {
    expect(rotuloDoCusto('G')).toBe('Custo por kg');
    expect(rotuloDoCusto('ML')).toBe('Custo por litro');
    expect(rotuloDoCusto('UN')).toBe('Custo');
  });
});

describe('montarItensDaFicha', () => {
  const insumos = [{ id: 1, unidade: 'G' }, { id: 2, unidade: 'UN' }];

  it('converte kg para g por insumo e monta o contrato do backend', () => {
    const r = montarItensDaFicha([
      { insumo_produto_id: '1', quantidade: '0,5', escolha: 'grande' },
      { insumo_produto_id: '2', quantidade: '6', escolha: 'base' },
    ], insumos);

    expect(r.erro).toBe('');
    expect(r.itens).toEqual([
      { insumo_produto_id: 1, quantidade_necessaria: 500 },
      { insumo_produto_id: 2, quantidade_necessaria: 6 },
    ]);
  });

  it('devolve o primeiro erro: vazio, sem insumo, repetido, quantidade inválida', () => {
    expect(montarItensDaFicha([], insumos).erro).toMatch(/ao menos um/);
    expect(montarItensDaFicha([{ insumo_produto_id: '', quantidade: '1' }], insumos).erro).toMatch(/insumo/i);
    expect(montarItensDaFicha([{ insumo_produto_id: '1', quantidade: '1' }, { insumo_produto_id: '1', quantidade: '2' }], insumos).erro).toMatch(/repetido/);
    expect(montarItensDaFicha([{ insumo_produto_id: '1', quantidade: '0,0005', escolha: 'grande' }], insumos).erro).toMatch(/3 casas/);
  });
});

describe('validarRendimento', () => {
  it('inteiro de 1 a 1.000.000', () => {
    expect(validarRendimento('12')).toBe('');
    expect(validarRendimento('1')).toBe('');
    for (const ruim of ['0', '-1', '1.5', 'abc', '']) expect(validarRendimento(ruim)).toMatch(/inteiro/);
    expect(validarRendimento('2000000')).toMatch(/máximo/);
  });
});
