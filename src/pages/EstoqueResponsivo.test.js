import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const css = readFileSync(join(resolve(process.cwd(), 'src'), 'pages', 'Estoque.css'), 'utf8').replace(/\r\n/g, '\n');

// Bloco @media (max-width: 768px) inteiro (até a chave de fechamento no início da linha).
const mobile = css.match(/@media \(max-width: 768px\) \{\n([\s\S]*?)\n\}/)?.[1] ?? '';

describe('Estoque: responsividade mobile (sem rolagem horizontal no documento)', () => {
  it('o layout desktop continua com 4 cartões de resumo e a tabela de largura total', () => {
    expect(css).toMatch(/\.estoque-summary \{[^}]*grid-template-columns: repeat\(4, 1fr\)/);
    expect(css).toMatch(/\.estoque-table \{\s*width: 100%;\s*border-collapse: collapse;\s*\}/);
  });

  it('os cartões de resumo encolhem (minmax(0, 1fr)) em vez de alargar a página', () => {
    expect(css).not.toMatch(/repeat\(2, 1fr\)/);
    expect(mobile).toMatch(/repeat\(2, minmax\(0, 1fr\)\)/);
  });

  it('a tabela rola só dentro do próprio cartão e não alarga o contêiner da página', () => {
    expect(mobile).toMatch(/\.card:has\(> \.estoque-table\) \{[^}]*overflow-x: auto/);
    expect(mobile).toMatch(/\.card:has\(> \.estoque-table\) \{[^}]*width: 0/);
    expect(mobile).toMatch(/\.card:has\(> \.estoque-table\) \{[^}]*min-width: 100%/);
    expect(mobile).toMatch(/\.estoque-table \{[^}]*min-width: \d+px/);
  });

  it('há fallback sem :has() (ex.: Firefox 114-120) com o mesmo efeito, escolhendo o cartão pela posição', () => {
    const fallback = css.match(/@supports not selector\(:has\(\*\)\) \{\n\s*@media \(max-width: 768px\) \{\n([\s\S]*?)\n  \}\n\}/)?.[1] ?? '';
    expect(fallback).toMatch(/\.estoque-filters ~ \.card \{/);
    for (const declaracao of ['width: 0', 'min-width: 100%', 'overflow-x: auto']) {
      expect(fallback).toContain(declaracao);
      expect(mobile).toContain(declaracao);
    }
  });

  it('a busca mantém largura utilizável, os filtros podem quebrar de linha e o SKU não quebra', () => {
    expect(mobile).toMatch(/\.estoque-filters \.input-icon-wrapper \{ min-width: min\(100%, 220px\); \}/);
    expect(mobile).toMatch(/\.estoque-filter-pills \{ flex-wrap: wrap; \}/);
    expect(mobile).toMatch(/\.estoque-sku \{ white-space: nowrap; \}/);
  });
});
