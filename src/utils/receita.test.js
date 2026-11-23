import { describe, it, expect } from 'vitest';
import { calcularReceita, formatarPeso, formatarVolume, receitasParaUnidades, resumoMassa, textoReceitas, unidadesParaReceitas } from './receita';

const insumos = [
  { id: 1, unidade: 'G', custo: 0.02 },
  { id: 2, unidade: 'G', custo: 0.005 },
  { id: 3, unidade: 'UN', custo: 0.9 },
  { id: 4, unidade: 'ML', custo: 0.01 },
];

describe('calcularReceita', () => {
  it('soma custo, peso e custo por unidade (kg convertido para g)', () => {
    const linhas = [
      { insumo_produto_id: '1', quantidade: '500', escolha: 'base' },
      { insumo_produto_id: '2', quantidade: '1,5', escolha: 'grande' },
      { insumo_produto_id: '3', quantidade: '4', escolha: 'base' },
    ];
    const r = calcularReceita(linhas, insumos, '8');
    // 500×0,02 = 10; 1500×0,005 = 7,5; 4×0,9 = 3,6
    expect(r.custoReceita).toBe(21.1);
    expect(r.custoPorUnidade).toBeCloseTo(2.6375, 4);
    expect(r.pesoG).toBe(2000);
    expect(r.pesoPorUnidadeG).toBe(250);
    expect(r.completa).toBe(true);
    expect(r.detalhes[1]).toMatchObject({ quantidadeBase: 1500, subtotal: 7.5 });
  });

  it('volume (ml) não entra no peso', () => {
    const r = calcularReceita([{ insumo_produto_id: '4', quantidade: '200', escolha: 'base' }], insumos, '1');
    expect(r.pesoG).toBe(0);
    expect(r.volumeMl).toBe(200);
  });

  it('linha incompleta ou sem custo deixa a conta marcada como incompleta, sem quebrar', () => {
    const r = calcularReceita([{ insumo_produto_id: '1', quantidade: 'abc', escolha: 'base' }, { insumo_produto_id: '', quantidade: '1', escolha: 'base' }], insumos, '2');
    expect(r.completa).toBe(false);
    expect(r.custoReceita).toBe(0);
    expect(calcularReceita([], insumos, '1').completa).toBe(false);
    const semCusto = calcularReceita([{ insumo_produto_id: '9', quantidade: '1', escolha: 'base' }], [{ id: 9, unidade: 'UN' }], '1');
    expect(semCusto.completa).toBe(false);
  });

  it('rendimento inválido não gera custo por unidade', () => {
    const r = calcularReceita([{ insumo_produto_id: '1', quantidade: '100', escolha: 'base' }], insumos, '0');
    expect(Number.isNaN(r.custoPorUnidade)).toBe(true);
  });
});

describe('formatação de massa', () => {
  it('peso e volume', () => {
    expect(formatarPeso(2000)).toBe('2 kg');
    expect(formatarPeso(1250)).toBe('1,25 kg');
    expect(formatarPeso(350)).toBe('350 g');
    expect(formatarPeso(0)).toBe('');
    expect(formatarVolume(1500)).toBe('1,5 L');
    expect(formatarVolume(300)).toBe('300 ml');
  });

  it('resumoMassa junta peso e volume e mostra o peso por unidade', () => {
    expect(resumoMassa({ pesoG: 2000, volumeMl: 200, pesoPorUnidadeG: 250 })).toEqual({ total: '2 kg + 200 ml', porUnidade: '250 g' });
    expect(resumoMassa({ pesoG: 0, volumeMl: 0, pesoPorUnidadeG: NaN })).toEqual({ total: '', porUnidade: '' });
  });
});

describe('receitasParaUnidades', () => {
  it('1 receita rende o rendimento; meia receita, metade', () => {
    expect(receitasParaUnidades('1', 8)).toMatchObject({ unidades: 8, erro: '' });
    expect(receitasParaUnidades('0,5', 8)).toMatchObject({ unidades: 4, erro: '' });
    expect(receitasParaUnidades('0.25', 8)).toMatchObject({ unidades: 2, erro: '' });
    expect(receitasParaUnidades('2', 40)).toMatchObject({ unidades: 80, erro: '' });
    expect(receitasParaUnidades('1,5', 12)).toMatchObject({ unidades: 18, erro: '' });
  });

  it('recusa quando não fecha em unidades inteiras, sugerindo valores que fecham', () => {
    const r = receitasParaUnidades('0,5', 5);
    expect(Number.isNaN(r.unidades)).toBe(true);
    expect(r.erro).toMatch(/não fecha em unidades inteiras/);
    expect(r.erro).toMatch(/Tente 1, 2/);
  });

  it('recusa vazio, zero, negativo e acima do limite', () => {
    for (const t of ['', '0', '-1', 'abc']) expect(receitasParaUnidades(t, 8).erro).not.toBe('');
    expect(receitasParaUnidades('200000', 10).erro).toMatch(/máxima/);
  });

  it('rendimento 1 mantém o comportamento antigo (receita = unidade)', () => {
    expect(receitasParaUnidades('3', 1)).toMatchObject({ unidades: 3, erro: '' });
    expect(receitasParaUnidades('0,5', 1).erro).not.toBe('');
  });
});

describe('unidadesParaReceitas / textoReceitas', () => {
  it('converte de volta e escreve em português', () => {
    expect(unidadesParaReceitas(4, 8)).toBe(0.5);
    expect(unidadesParaReceitas(8, 8)).toBe(1);
    expect(unidadesParaReceitas(10, 0)).toBeNull();
    expect(textoReceitas(0.5)).toBe('0,5 receitas');
    expect(textoReceitas(1)).toBe('1 receita');
    expect(textoReceitas(null)).toBe('');
  });
});
