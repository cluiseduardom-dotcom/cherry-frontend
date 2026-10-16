import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(process.cwd(), 'src');
const ler = (...partes) => readFileSync(join(SRC, ...partes), 'utf8').replace(/\r\n/g, '\n');

// Telas cujas tabelas rolam só dentro do cartão no celular (esperado: nº de tabelas).
const TELAS = {
  'Historico.jsx': 1,
  'ContasPagar.jsx': 1,
  'ContasReceber.jsx': 1,
  'DespesasFixas.jsx': 1,
  'CategoriasProduto.jsx': 2,
};

describe('.table-scroll: tabela confinada ao cartão', () => {
  const css = ler('index.css');
  const regra = css.match(/\.table-scroll \{([^}]*)\}/)?.[1] ?? '';

  it('a regra global rola na horizontal e não alarga o contêiner da página', () => {
    expect(regra).toMatch(/overflow-x:\s*auto/);
    expect(regra).toMatch(/width:\s*0/);
    expect(regra).toMatch(/min-width:\s*100%/);
  });

  it('a regra não depende de :has() nem fica restrita a uma media query', () => {
    expect(regra).not.toMatch(/:has\(/);
    const antes = css.slice(0, css.indexOf('.table-scroll {'));
    const abertas = (antes.match(/@media[^{]*\{/g) ?? []).length;
    const fechadas = (antes.match(/^\}/gm) ?? []).length;
    expect(abertas).toBeLessThanOrEqual(fechadas);
  });

  for (const [arquivo, esperado] of Object.entries(TELAS)) {
    it(`${arquivo}: toda <table> está dentro de .table-scroll`, () => {
      const linhas = ler('pages', arquivo).split('\n');
      const tabelas = linhas.map((l, i) => (/^\s*<table\b/.test(l) ? i : -1)).filter(i => i >= 0);
      expect(tabelas).toHaveLength(esperado);
      for (const i of tabelas) {
        let j = i - 1;
        while (j >= 0 && !linhas[j].trim()) j -= 1;
        expect(linhas[j].trim(), `${arquivo} linha ${i + 1}`).toBe('<div className="table-scroll">');
      }
      const abre = linhas.filter(l => l.includes('<div className="table-scroll">')).length;
      expect(abre).toBe(esperado);
    });
  }
});
