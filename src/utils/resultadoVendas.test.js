import { describe, it, expect } from 'vitest';
import { formatarPct, somarResultados, periodosPredefinidos, rotuloMes } from './resultadoVendas';

const resultado = (receita, custo, comissao = 0, impostos = 0) => ({
  receita, custo, comissao, impostos,
  lucro_bruto: receita - custo,
  lucro_liquido: receita - custo - comissao - impostos,
});

describe('somarResultados', () => {
  it('soma só as concluídas e calcula a % sobre a receita total (não a média das %)', () => {
    const vendas = [
      { id: 1, status: 'finalizada', resultado: resultado(180, 80, 18, 18) },
      { id: 2, status: 'finalizada', resultado: resultado(100, 30, 0, 10) },
      { id: 3, status: 'cancelada', resultado: null },
    ];

    expect(somarResultados(vendas)).toEqual({
      vendas: 2, receita: 280, custo: 110, comissao: 18, impostos: 28,
      lucro_bruto: 170, margem_bruta_pct: 60.71,
      lucro_liquido: 124, margem_liquida_pct: 44.29,
    });
  });

  it('sem nenhuma venda com resultado (usuário sem ver_custos) devolve null: a tela esconde o lucro', () => {
    expect(somarResultados([{ id: 1, status: 'finalizada' }])).toBeNull();
    expect(somarResultados([])).toBeNull();
    expect(somarResultados(undefined)).toBeNull();
  });

  it('só canceladas com campo presente: zera, sem % (receita 0)', () => {
    const r = somarResultados([{ id: 1, status: 'cancelada', resultado: null }, { id: 2, status: 'finalizada', resultado: resultado(0, 0) }]);

    expect(r).toMatchObject({ vendas: 1, receita: 0, lucro_bruto: 0, margem_bruta_pct: null, margem_liquida_pct: null });
  });

  it('prejuízo continua negativo', () => {
    expect(somarResultados([{ status: 'finalizada', resultado: resultado(100, 130) }])).toMatchObject({ lucro_bruto: -30, margem_bruta_pct: -30 });
  });
});

describe('formatarPct', () => {
  it('formata com vírgula e 1 casa; ausente vira traço', () => {
    expect(formatarPct(55.56)).toBe('55,6%');
    expect(formatarPct(-3)).toBe('-3,0%');
    expect(formatarPct(null)).toBe('—');
    expect(formatarPct(undefined)).toBe('—');
  });
});

describe('periodosPredefinidos', () => {
  it('meio do ano', () => {
    const [atual, anterior, tres, ano] = periodosPredefinidos('2026-11-16');

    expect(atual).toMatchObject({ data_de: '2026-11-01', data_ate: '2026-11-16', agrupar: undefined });
    expect(anterior).toMatchObject({ data_de: '2026-10-01', data_ate: '2026-10-31' });
    expect(tres).toMatchObject({ data_de: '2026-09-01', data_ate: '2026-11-16', agrupar: 'mes' });
    expect(ano).toMatchObject({ data_de: '2026-01-01', data_ate: '2026-11-16', agrupar: 'mes' });
  });

  it('virada do ano: mês anterior e 3 meses cruzam o ano; fevereiro respeita o último dia', () => {
    const jan = periodosPredefinidos('2027-01-10');
    expect(jan[1]).toMatchObject({ data_de: '2026-12-01', data_ate: '2026-12-31' });
    expect(jan[2]).toMatchObject({ data_de: '2026-11-01' });

    const mar = periodosPredefinidos('2027-03-05');
    expect(mar[1]).toMatchObject({ data_de: '2027-02-01', data_ate: '2027-02-28' });
    expect(periodosPredefinidos('2028-03-05')[1].data_ate).toBe('2028-02-29');
  });
});

describe('rotuloMes', () => {
  it('mês/ano abreviado', () => {
    expect(rotuloMes('2026-03')).toBe('mar/2026');
    expect(rotuloMes('2026-12')).toBe('dez/2026');
    expect(rotuloMes('xx')).toBe('xx');
  });
});
