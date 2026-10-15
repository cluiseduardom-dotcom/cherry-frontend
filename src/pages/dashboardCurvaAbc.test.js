import { describe, it, expect } from 'vitest';
import {
  COMPRIMENTO_VALOR_VERTICAL,
  abreviarNome,
  configurarRotulos,
  eixoFaturamento,
  formatarMoeda,
  formatarPercentual,
  montarSeriePareto,
  numeroSeguro,
  posicionarValorHorizontal,
  posicionarValorVertical,
  montarRotuloEixo,
  rotulosDoEixo,
} from './dashboardCurvaAbc';

const curva = [
  { id: 1, nome: 'Brinco A', faturamento: '600.00', percentual_acumulado: '60.00', curva: 'A' },
  { id: 2, nome: 'Colar B', faturamento: '300.00', percentual_acumulado: '90.00', curva: 'B' },
  { id: 3, nome: 'Anel C', faturamento: '100.00', percentual_acumulado: '100.00', curva: 'C' },
];

describe('montarSeriePareto', () => {
  it('mantém a ordem por faturamento decrescente e numera a partir de 1', () => {
    const { pontos } = montarSeriePareto([curva[2], curva[0], curva[1]]);
    expect(pontos.map(p => p.nome)).toEqual(['Brinco A', 'Colar B', 'Anel C']);
    expect(pontos.map(p => p.rank)).toEqual([1, 2, 3]);
  });

  it('desempata por id quando o faturamento é igual', () => {
    const { pontos } = montarSeriePareto([
      { id: 9, nome: 'Z', faturamento: 50 },
      { id: 2, nome: 'Y', faturamento: 50 },
    ]);
    expect(pontos.map(p => p.id)).toEqual([2, 9]);
  });

  it('calcula a participação individual sobre o faturamento total de todos os itens', () => {
    const { pontos, total } = montarSeriePareto(curva);
    expect(total).toBe(1000);
    expect(pontos.map(p => p.participacao)).toEqual([60, 30, 10]);
  });

  it('a participação considera todos os produtos, mesmo os fora do limite exibido', () => {
    const { pontos, total } = montarSeriePareto(curva, 2);
    expect(pontos).toHaveLength(2);
    expect(total).toBe(1000);
    expect(pontos[1].participacao).toBe(30);
  });

  it('usa o percentual acumulado informado pelo backend', () => {
    const { pontos } = montarSeriePareto(curva);
    expect(pontos.map(p => p.acumulado)).toEqual([60, 90, 100]);
  });

  it('recalcula o acumulado na ordem quando o backend não informa', () => {
    const { pontos } = montarSeriePareto([
      { id: 1, nome: 'A', faturamento: 600 },
      { id: 2, nome: 'B', faturamento: 400, percentual_acumulado: null },
    ]);
    expect(pontos.map(p => p.acumulado)).toEqual([60, 100]);
  });

  it('não altera a classificação da curva vinda do backend', () => {
    const { pontos } = montarSeriePareto(curva);
    expect(pontos.map(p => p.curva)).toEqual(['A', 'B', 'C']);
  });

  it('expõe o SKU só quando a fonte o fornece, sem inventar', () => {
    const { pontos } = montarSeriePareto([
      { id: 1, nome: 'Com SKU', faturamento: 10, sku: 'BR-001' },
      { id: 2, nome: 'Sem SKU', faturamento: 5 },
    ]);
    expect(pontos[0].sku).toBe('BR-001');
    expect(pontos[1].sku).toBeNull();
  });

  it('dados vazios ou inválidos resultam em série vazia', () => {
    expect(montarSeriePareto([])).toEqual({ pontos: [], total: 0 });
    expect(montarSeriePareto(null)).toEqual({ pontos: [], total: 0 });
    expect(montarSeriePareto(undefined)).toEqual({ pontos: [], total: 0 });
  });

  it('faturamento nulo, ausente ou não numérico vira zero, sem NaN', () => {
    const { pontos, total } = montarSeriePareto([
      { id: 1, nome: 'A', faturamento: 100 },
      { id: 2, nome: 'B', faturamento: null },
      { id: 3, nome: 'C' },
      { id: 4, nome: 'D', faturamento: 'abc' },
    ]);
    expect(total).toBe(100);
    for (const p of pontos) {
      expect(Number.isFinite(p.faturamento)).toBe(true);
      expect(Number.isFinite(p.participacao)).toBe(true);
      expect(Number.isFinite(p.acumulado)).toBe(true);
    }
    expect(pontos[1].participacao).toBe(0);
  });

  it('total zero não gera divisão por zero', () => {
    const { pontos } = montarSeriePareto([{ id: 1, nome: 'A', faturamento: 0 }]);
    expect(pontos[0].participacao).toBe(0);
    expect(pontos[0].acumulado).toBe(0);
  });

  it('não muta a lista original', () => {
    const original = [curva[2], curva[0]];
    montarSeriePareto(original);
    expect(original.map(p => p.id)).toEqual([3, 1]);
  });
});

describe('abreviarNome', () => {
  it('mantém nomes curtos e abrevia os longos com reticências', () => {
    expect(abreviarNome('Anel', 10)).toBe('Anel');
    const longo = abreviarNome('Camiseta Básica Algodão Premium Branca', 13);
    expect(longo.endsWith('…')).toBe(true);
    expect(longo.length).toBeLessThanOrEqual(13);
  });

  it('tolera nome ausente', () => {
    expect(abreviarNome(null, 10)).toBe('');
    expect(abreviarNome(undefined, 10)).toBe('');
  });
});

describe('configurarRotulos', () => {
  it('desktop: rótulos horizontais e valores completos', () => {
    const r = configurarRotulos(640, 8);
    expect(r.horizontal).toBe(false);
    const largo = configurarRotulos(1000, 8);
    expect(largo.horizontal).toBe(true);
    expect(largo.valorCompleto).toBe(true);
  });

  it('celular: rótulos inclinados curtos e valores verticais, sem exigir largura extra', () => {
    const r = configurarRotulos(260, 8);
    expect(r.horizontal).toBe(false);
    expect(r.maxCaracteres).toBeLessThanOrEqual(13);
    expect(r.valorVertical).toBe(true);
    expect(r.alturaEixo).toBeGreaterThan(34);
  });
});

describe('posicionarValorHorizontal', () => {
  it('sem colisão com o selo, mantém o valor 6px acima da coluna', () => {
    expect(posicionarValorHorizontal({ topoY: 100, pontoY: 200 })).toBe(94);
    expect(posicionarValorHorizontal({ topoY: 300, pontoY: 150 })).toBe(294);
  });

  it('ponto perto do topo da coluna: o valor sobe para acima do selo, sem sobrepor', () => {
    // ponto 5px abaixo do topo: o selo (pontoY-20,5 .. pontoY-3,5) invade a faixa do valor
    const y = posicionarValorHorizontal({ topoY: 100, pontoY: 105 });
    const seloTopo = 105 - 12 - 17 / 2;

    expect(y).toBeLessThan(94);
    expect(y).toBeLessThan(seloTopo);
  });

  it('ponto ligeiramente acima do topo (selo cobrindo o valor) também desloca o valor', () => {
    expect(posicionarValorHorizontal({ topoY: 100, pontoY: 98 })).toBeLessThan(94);
  });

  it('selo bem acima do valor não desloca', () => {
    expect(posicionarValorHorizontal({ topoY: 100, pontoY: 60 })).toBe(94);
  });

  it('sem ponto válido (NaN) usa a posição padrão', () => {
    expect(posicionarValorHorizontal({ topoY: 100, pontoY: NaN })).toBe(94);
  });
});

describe('posicionarValorVertical', () => {
  const base = { topoY: 100, baseY: 300 }; // coluna de 200px

  it('prefere o rótulo dentro da coluna, na base, quando o ponto da linha não atrapalha', () => {
    const r = posicionarValorVertical({ ...base, pontoY: 40 });
    expect(r).toEqual({ modo: 'dentro', y: 294 });
  });

  it('se o ponto cai sobre o rótulo da base, usa o topo da coluna', () => {
    const r = posicionarValorVertical({ ...base, pontoY: 260 });
    expect(r.modo).toBe('dentro');
    expect(r.y).toBe(100 + 6 + COMPRIMENTO_VALOR_VERTICAL);
  });

  it('se o ponto cai também sobre o topo, o rótulo vai para fora, acima da coluna', () => {
    const colunaCurta = { topoY: 200, baseY: 300 };
    const r = posicionarValorVertical({ ...colunaCurta, pontoY: 250, comprimento: 64 });
    expect(r).toEqual({ modo: 'fora', y: 194 });
  });

  it('coluna baixa demais para o texto fica fora', () => {
    expect(posicionarValorVertical({ topoY: 280, baseY: 300, pontoY: 10 })).toEqual({ modo: 'fora', y: 274 });
  });

  it('sem ponto (NaN) não há conflito', () => {
    expect(posicionarValorVertical({ ...base, pontoY: NaN }).modo).toBe('dentro');
  });

  it('o resultado nunca sobrepõe o ponto da linha dentro da folga', () => {
    for (let pontoY = 90; pontoY <= 310; pontoY += 5) {
      const r = posicionarValorVertical({ ...base, pontoY });
      if (r.modo !== 'dentro') continue;
      const fim = r.y;
      const inicio = r.y - COMPRIMENTO_VALOR_VERTICAL;
      expect(pontoY < inicio - 10 || pontoY > fim + 10).toBe(true);
    }
  });
});

describe('rotulosDoEixo / montarRotuloEixo', () => {
  it('mantém o nome quando é único', () => {
    const m = rotulosDoEixo([{ rank: 1, nome: 'Anel' }, { rank: 2, nome: 'Colar' }]);
    expect(m.get(1)).toEqual({ nome: 'Anel', sufixo: '' });
    expect(montarRotuloEixo(m.get(2), 12)).toBe('Colar');
  });

  it('nomes repetidos usam o SKU como sufixo quando disponível', () => {
    const m = rotulosDoEixo([
      { rank: 1, nome: 'Brinco', sku: 'BR-01' },
      { rank: 2, nome: 'Brinco', sku: 'BR-02' },
    ]);
    expect(m.get(1).sufixo).toBe(' · BR-01');
    expect(m.get(2).sufixo).toBe(' · BR-02');
  });

  it('nomes repetidos sem SKU usam a posição, sem inventar identificação', () => {
    const m = rotulosDoEixo([
      { rank: 1, nome: 'Colar Corrente Fina', sku: null },
      { rank: 2, nome: 'Colar Corrente Fina', sku: null },
    ]);
    expect(m.get(1).sufixo).toBe(' (1º)');
    expect(m.get(2).sufixo).toBe(' (2º)');
  });

  it('depois de abreviar, rótulos de nomes repetidos continuam diferentes', () => {
    const m = rotulosDoEixo([
      { rank: 1, nome: 'Colar Corrente Fina', sku: 'COL-001' },
      { rank: 2, nome: 'Colar Corrente Fina', sku: 'COL-002' },
    ]);
    for (const max of [11, 14, 16, 30]) {
      expect(montarRotuloEixo(m.get(1), max)).not.toBe(montarRotuloEixo(m.get(2), max));
    }
    const semSku = rotulosDoEixo([
      { rank: 1, nome: 'Colar Corrente Fina', sku: null },
      { rank: 2, nome: 'Colar Corrente Fina', sku: null },
    ]);
    expect(montarRotuloEixo(semSku.get(1), 11)).not.toBe(montarRotuloEixo(semSku.get(2), 11));
  });

  it('o sufixo nunca é cortado e o texto respeita o limite quando possível', () => {
    const m = rotulosDoEixo([
      { rank: 1, nome: 'Brinco Argola Grande', sku: 'BR-1' },
      { rank: 2, nome: 'Brinco Argola Grande', sku: 'BR-2' },
    ]);
    const texto = montarRotuloEixo(m.get(1), 16);
    expect(texto.endsWith(' · BR-1')).toBe(true);
    expect(texto.length).toBeLessThanOrEqual(16);
  });

  it('sem espaço para o nome, mostra só o identificador', () => {
    const m = rotulosDoEixo([
      { rank: 1, nome: 'Colar', sku: 'COLAR-LONGO-001' },
      { rank: 2, nome: 'Colar', sku: 'COLAR-LONGO-002' },
    ]);
    expect(montarRotuloEixo(m.get(1), 11)).toBe('COLAR-LONGO-001');
  });
});
describe('eixoFaturamento', () => {
  it('cria 4 intervalos iguais, com folga acima do maior valor', () => {
    const { max, ticks } = eixoFaturamento(9800);
    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toBe(0);
    expect(ticks[4]).toBe(max);
    expect(max).toBeGreaterThan(9800);
    const passo = ticks[1] - ticks[0];
    ticks.forEach((t, i) => expect(t).toBeCloseTo(i * passo));
  });

  it('usa passos redondos', () => {
    expect(eixoFaturamento(9800).ticks).toEqual([0, 3000, 6000, 9000, 12000]);
    expect(eixoFaturamento(1000).ticks).toEqual([0, 300, 600, 900, 1200]);
  });

  it('valor zero, nulo ou inválido devolve uma escala mínima válida', () => {
    for (const v of [0, null, undefined, 'x']) {
      const { max, ticks } = eixoFaturamento(v);
      expect(max).toBeGreaterThan(0);
      expect(ticks).toHaveLength(5);
    }
  });
});

describe('formatadores', () => {
  it('formata moeda em reais e percentual em pt-BR', () => {
    expect(formatarMoeda(9800)).toMatch(/R\$\s?9\.800,00/);
    expect(formatarPercentual(16.4)).toBe('16,4%');
    expect(formatarPercentual(100)).toBe('100%');
  });

  it('numeroSeguro devolve 0 para valores inválidos', () => {
    expect(numeroSeguro(null)).toBe(0);
    expect(numeroSeguro(undefined)).toBe(0);
    expect(numeroSeguro('x')).toBe(0);
    expect(numeroSeguro('12.5')).toBe(12.5);
  });
});
