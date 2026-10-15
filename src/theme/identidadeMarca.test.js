import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = process.cwd();
const SRC = resolve(RAIZ, 'src');
const ler = (...partes) => readFileSync(join(...partes), 'utf8');

describe('identidade padrão no index.html', () => {
  const html = ler(RAIZ, 'index.html');

  it('título, descrição e favicon são do VERTUMNO, sem mencionar Cherry', () => {
    expect(html).toMatch(/<title>VERTUMNO/);
    expect(html).toMatch(/<meta name="description" content="VERTUMNO/);
    expect(html).not.toMatch(/Cherry|semijoias/i);
    expect(html).not.toMatch(/cherry-logo/);
  });

  it('o favicon aponta para um arquivo que existe em public/', () => {
    const href = html.match(/<link rel="icon"[^>]*href="\/([^"]+)"/)?.[1];
    expect(href).toBe('favicon-vertumno.png');
    expect(statSync(join(RAIZ, 'public', href)).size).toBeGreaterThan(1_000);
  });
});

describe('login com a identidade do tema', () => {
  const jsx = ler(SRC, 'pages', 'Login.jsx');

  it('usa o logo e os textos do tema ativo, sem marca fixa', () => {
    expect(jsx).toContain('marca.logo');
    expect(jsx).toContain('marca.loginDescricao');
    expect(jsx).not.toMatch(/>Cherry</);
    expect(jsx).not.toMatch(/SEMIJOIAS</);
    expect(jsx).not.toMatch(/Cherry Semijoias/);
  });

  it('só mostra o ícone de cereja quando o tema define mostrarIcone', () => {
    expect(jsx).toMatch(/marca\.mostrarIcone/);
  });
});

describe('linha de produto sem azul fixo', () => {
  const css = ler(SRC, 'components', 'ProductRow.css');

  it('usa os tokens do tema nas cores de marca (botão, preço, foco e seleção)', () => {
    expect(css).not.toMatch(/#0A1F44|#007BFF|#F0F7FF/i);
    expect(css).not.toMatch(/rgba\(\s*10,\s*31,\s*68|rgba\(\s*0,\s*123,\s*255/);
    expect(css).toContain('var(--color-primary)');
    expect(css).toContain('var(--color-secondary)');
  });
});
