import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { TEMAS, corDoProduto, corPrimariaRgb, marcaAtiva } from './themes';

const SRC = resolve(process.cwd(), 'src');
const ler = (...partes) => readFileSync(join(SRC, ...partes), 'utf8');

describe('marca ativa, paleta de produto e PDF', () => {
  it('marcaAtiva segue o data-theme e cai no padrão sem tema', () => {
    expect(marcaAtiva({ dataset: { theme: 'cherry' } }).nomeCompleto).toBe('Cherry Semijoias');
    expect(marcaAtiva({ dataset: { theme: 'vertumno' } }).nomeCompleto).toBe('VERTUMNO');
    expect(marcaAtiva({ dataset: {} }).nomeCompleto).toBe('VERTUMNO');
    expect(marcaAtiva({ dataset: { theme: '__proto__' } }).nomeCompleto).toBe('VERTUMNO');
    expect(marcaAtiva(null).nomeCompleto).toBe('VERTUMNO');
  });

  it('a paleta de produto é própria de cada marca e sempre em hex de 6 dígitos', () => {
    const v = TEMAS.vertumno.marca.paleta;
    const c = TEMAS.cherry.marca.paleta;
    for (const cor of [...v, ...c]) expect(cor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(v.filter(cor => c.includes(cor))).toEqual([]);
    expect(v.join(' ')).not.toMatch(/A70636|D33A63|760426|91052F|5D031E/i);
    expect(c.join(' ')).not.toMatch(/0B2545|1F5FBF|13315C|091D38|2466C9/i);
  });

  it('corDoProduto é estável, circular e tolera id inválido', () => {
    const { marca } = TEMAS.cherry;
    expect(corDoProduto(0, marca)).toBe(marca.paleta[0]);
    expect(corDoProduto(marca.paleta.length + 2, marca)).toBe(marca.paleta[2]);
    expect(corDoProduto(undefined, marca)).toBe(marca.paleta[0]);
    expect(corDoProduto('x', marca)).toBe(marca.paleta[0]);
    expect(corDoProduto(-3, marca)).toBe(marca.paleta[3]);
  });

  it('corPrimariaRgb sem estilo disponível usa o padrão VERTUMNO', () => {
    expect(corPrimariaRgb(null)).toEqual([11, 37, 69]);
  });

  it('o PDF dos relatórios não tem mais marca, cor ou logo fixos do Cherry', () => {
    const pdf = ler('pages', 'relatorios', 'relatoriosUtils.js');
    expect(pdf).not.toMatch(/Cherry Semijoias|cherry-logo|167,\s*6,\s*54/);
    expect(pdf).toContain('marcaAtiva()');
    expect(pdf).toContain('corPrimariaRgb()');
  });

  it('nenhuma tela mantém a paleta de avatares duplicada', () => {
    for (const arquivo of ['Produtos.jsx', 'Estoque.jsx', 'Venda.jsx']) {
      expect(ler('pages', arquivo), arquivo).not.toMatch(/#C9A96E/);
    }
    expect(ler('pages', 'Venda.jsx')).toContain("from '../theme/themes'");
    expect(ler('pages', 'Estoque.jsx')).toContain("from '../theme/themes'");
  });

  it('ConfiguracaoSku.css não usa mais fundos rosados fixos', () => {
    expect(ler('pages', 'ConfiguracaoSku.css')).not.toMatch(/#FF[F0-9A-F]{4}\b/i);
  });

  it('o título de página não cai mais em "Cherry" fixo', () => {
    expect(ler('components', 'Layout.jsx')).not.toMatch(/\?\?\s*'Cherry'/);
  });
});
