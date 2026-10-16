import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(process.cwd(), 'src');
const ler = (...partes) => readFileSync(join(SRC, ...partes), 'utf8').replace(/\r\n/g, '\n');

const css = ler('pages', 'Relatorios.css');
const regra = seletor => css.match(new RegExp(`${seletor.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`))?.[1] ?? '';
const bloco = consulta => css.match(new RegExp(`@media \\(max-width: ${consulta}px\\) \\{\\n([\\s\\S]*?)\\n\\}`))?.[1] ?? '';

describe('Relatórios: sem rolagem horizontal da página', () => {
  it('as tabelas rolam só dentro do cartão e não alargam o contêiner da página', () => {
    const r = regra('.rel-table-scroll');
    expect(r).toMatch(/overflow-x:\s*auto/);
    expect(r).toMatch(/width:\s*0/);
    expect(r).toMatch(/min-width:\s*100%/);
    expect(r).not.toMatch(/:has\(/);
  });

  it('o gráfico de barras não alarga a página e as barras podem encolher', () => {
    const chart = regra('.rel-bar-chart');
    expect(chart).toMatch(/width:\s*0/);
    expect(chart).toMatch(/min-width:\s*100%/);
    expect(regra('.rel-bar-wrap')).toMatch(/flex:\s*1 1 18px/);
  });

  it('as grades usam minmax(0, 1fr), para os itens poderem encolher', () => {
    expect(css).not.toMatch(/repeat\(\d, 1fr\)/);
    expect(css).not.toMatch(/grid-template-columns:\s*1fr( 1fr)?;/);
    expect(regra('.rel-kpis')).toMatch(/repeat\(4, minmax\(0, 1fr\)\)/);
    expect(regra('.rel-financeiro-tables')).toMatch(/minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  });

  it('as larguras pequenas ajustam barras, respiro lateral e valores dos indicadores', () => {
    expect(bloco(1100)).toMatch(/\.rel-bar-chart \{ padding-inline: 8px; \}/);
    expect(bloco(768)).toMatch(/\.rel-bar-chart \{ gap: 3px; \}/);
    expect(bloco(768)).toMatch(/\.rel-bar-wrap \{ flex-basis: 10px; min-width: 6px; \}/);
    expect(regra('.rel-kpi-value')).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('em ≤480 px o valor dos indicadores usa 17 px, para valores de cinco dígitos caberem em uma linha (390 e 360 px)', () => {
    const lg = Number(ler('index.css').match(/--font-size-lg:\s*(\d+)px/)?.[1]);
    const xl = Number(ler('index.css').match(/--font-size-xl:\s*(\d+)px/)?.[1]);
    expect(bloco(480)).toMatch(/\.rel-kpi-value \{ font-size: var\(--font-size-lg\); \}/);
    expect(bloco(480)).not.toMatch(/--font-size-xl/);
    // 20 px (xl) quebrava "R$ 11.075,95" no meio do número nos cartões de ~170 px
    expect(lg).toBe(17);
    expect(lg).toBeLessThan(xl);
  });

  it('em ≤480 px a barra de abas cabe a 360 px e, se faltar espaço, rola só dentro de si', () => {
    expect(bloco(480)).toMatch(/\.rel-tabs \{ gap: var\(--space-1\); width: 0; min-width: 100%; overflow-x: auto; \}/);
    expect(bloco(480)).toMatch(/\.rel-tab \{ padding-inline: var\(--space-3\); flex: 0 0 auto; white-space: nowrap; margin-bottom: 0; \}/);
  });

  it('a barra de abas no desktop não muda (sem contenção, respiro e sobreposição de 1 px originais)', () => {
    expect(regra('.rel-tabs')).not.toMatch(/overflow|width/);
    expect(regra('.rel-tabs')).toMatch(/gap:\s*var\(--space-2\)/);
    expect(regra('.rel-tab')).toMatch(/padding:\s*var\(--space-3\) var\(--space-4\)/);
    expect(regra('.rel-tab')).toMatch(/margin-bottom:\s*-1px/);
    expect(bloco(768)).not.toMatch(/\.rel-tabs?\b/);
    expect(bloco(1100)).not.toMatch(/\.rel-tabs?\b/);
  });

  it('o tamanho do valor dos indicadores no desktop não muda (só ≤480 px)', () => {
    expect(regra('.rel-kpi-value')).toMatch(/font-size:\s*var\(--font-size-2xl\)/);
    expect(bloco(768)).not.toMatch(/rel-kpi-value/);
    expect(bloco(1100)).not.toMatch(/rel-kpi-value/);
  });

  it('o desktop não muda: grade de 4 indicadores e barras com 18 px de base', () => {
    expect(regra('.rel-kpis')).toMatch(/repeat\(4, minmax\(0, 1fr\)\)/);
    expect(regra('.rel-bar-wrap')).toMatch(/flex:\s*1 1 18px/);
    expect(regra('.rel-bar-wrap')).toMatch(/min-width:\s*12px/);
  });

  for (const [arquivo, esperado] of [['RelatorioVendas.jsx', 1], ['RelatorioEstoque.jsx', 1], ['RelatorioFinanceiro.jsx', 2]]) {
    it(`${arquivo}: toda <table> está dentro de .rel-table-scroll`, () => {
      const linhas = ler('pages', 'relatorios', arquivo).split('\n');
      const tabelas = linhas.map((l, i) => (/^\s*<table\b/.test(l) ? i : -1)).filter(i => i >= 0);
      expect(tabelas).toHaveLength(esperado);
      for (const i of tabelas) {
        let j = i - 1;
        while (j >= 0 && !linhas[j].trim()) j -= 1;
        expect(linhas[j].trim(), `${arquivo} linha ${i + 1}`).toBe('<div className="rel-table-scroll">');
      }
    });
  }
});

describe('Exportação de PDF continua completa no celular', () => {
  const util = ler('pages', 'relatorios', 'relatoriosUtils.js');

  it('a captura desfaz, só na cópia da página, os contêineres de rolagem e as grades com minmax(0, …)', () => {
    expect(util).toMatch(/onclone:\s*clonedDoc\s*=>/);
    expect(util).toContain(".rel-table-scroll, .rel-bar-chart");
    expect(util).toContain(".rel-financeiro-tables, .rel-kpis");
    expect(util).toMatch(/el\.style\.overflow = 'visible'/);
    expect(util).toMatch(/Array\(colunas\)\.fill\('1fr'\)/);
  });

  it('o gráfico de linha do Financeiro ocupa 100% do cartão na captura (o html2canvas copia a largura da tela)', () => {
    const onclone = util.slice(util.indexOf('onclone:'));
    expect(onclone).toMatch(/querySelectorAll\('\.rel-line-chart'\)\.forEach\(el => \{\s*el\.style\.width = '100%';/);
  });

  it('a aparência do gráfico de linha na tela não muda (a regra vale só na cópia usada na captura)', () => {
    expect(regra('.rel-line-chart')).toMatch(/width:\s*100%/);
    expect(regra('.rel-line-chart')).toMatch(/height:\s*180px/);
    expect(regra('.rel-line-chart')).toMatch(/display:\s*block/);
    expect(css).not.toMatch(/\.rel-line-chart[^{]*\{[^}]*(min-width|overflow)/);
  });
});
