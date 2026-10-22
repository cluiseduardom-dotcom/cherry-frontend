import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(process.cwd(), 'src');
const ler = (...partes) => readFileSync(join(...partes), 'utf8');

describe('linha de produto sem azul fixo', () => {
  const css = ler(SRC, 'components', 'ProductRow.css');

  it('usa os tokens do tema nas cores de marca (botão, preço, foco e seleção)', () => {
    expect(css).not.toMatch(/#0A1F44|#007BFF|#F0F7FF/i);
    expect(css).not.toMatch(/rgba\(\s*10,\s*31,\s*68|rgba\(\s*0,\s*123,\s*255/);
    expect(css).toContain('var(--color-primary)');
    expect(css).toContain('var(--color-secondary)');
  });
});
