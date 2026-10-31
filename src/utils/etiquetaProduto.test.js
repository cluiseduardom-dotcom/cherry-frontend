import { describe, it, expect } from 'vitest';
import {
  ajustarTexto, expandirCopias, formatarPrecoEtiqueta, MODULO_MINIMO_RECOMENDADO_MM, planoDaEtiqueta,
  posicoesNaFolha, PRESET_FOLHA_A4, PRESET_NIMBOT_D110, validarFolha, ZONA_SILENCIO_MODULOS,
} from './etiquetaProduto.js';
import { larguraEmModulos } from './codigoBarras128.js';

const ETIQUETA = { codigo: '000042', nome: 'Brinco argola ouro', preco: 49.9 };

describe('planoDaEtiqueta', () => {
  it('na etiqueta 30x15 da Nimbot tudo cabe dentro da etiqueta e o módulo passa do mínimo', () => {
    const p = planoDaEtiqueta(ETIQUETA, PRESET_NIMBOT_D110);

    expect(p.pequenaDemais).toBe(false);
    expect(p.moduloMm).toBeGreaterThanOrEqual(MODULO_MINIMO_RECOMENDADO_MM);

    for (const b of p.barras) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(p.larguraMm + 1e-9);
      expect(b.y + b.h).toBeLessThanOrEqual(p.alturaMm);
    }
  });

  it('mantém a zona de silêncio nas duas laterais', () => {
    const p = planoDaEtiqueta(ETIQUETA, PRESET_NIMBOT_D110);
    const primeira = p.barras[0];
    const ultima = p.barras[p.barras.length - 1];

    expect(primeira.x).toBeGreaterThanOrEqual(ZONA_SILENCIO_MODULOS * p.moduloMm - 1e-9);
    expect(p.larguraMm - (ultima.x + ultima.w)).toBeGreaterThanOrEqual(ZONA_SILENCIO_MODULOS * p.moduloMm - 1e-9);
  });

  it('com passo de pixel, o módulo é número inteiro de pixels (203 dpi)', () => {
    const passo = 25.4 / 203;
    const p = planoDaEtiqueta(ETIQUETA, { ...PRESET_NIMBOT_D110, passoMm: passo });

    expect(p.moduloMm / passo).toBeCloseTo(Math.round(p.moduloMm / passo), 6);
    expect(p.moduloMm / passo).toBeGreaterThanOrEqual(1);
  });

  it('código longo em etiqueta pequena avisa que o módulo ficou pequeno demais', () => {
    const p = planoDaEtiqueta({ ...ETIQUETA, codigo: 'ABCDEFGHIJKLMNOPQRST' }, PRESET_NIMBOT_D110);

    expect(p.pequenaDemais).toBe(true);
  });

  it('preço aparece à direita e o código à esquerda; sem preço o código vai centralizado', () => {
    const com = planoDaEtiqueta(ETIQUETA, PRESET_NIMBOT_D110).textos;
    const sem = planoDaEtiqueta({ ...ETIQUETA, preco: null }, PRESET_NIMBOT_D110).textos;

    expect(com.find((t) => t.texto === 'R$ 49,90')).toMatchObject({ alinhamento: 'right', negrito: true });
    expect(com.find((t) => t.texto === '000042')).toMatchObject({ alinhamento: 'left' });
    expect(sem.find((t) => t.texto === '000042')).toMatchObject({ alinhamento: 'center' });
    expect(sem.some((t) => t.texto.startsWith('R$'))).toBe(false);
  });

  it('largura das barras corresponde aos módulos do código', () => {
    const p = planoDaEtiqueta(ETIQUETA, PRESET_NIMBOT_D110);
    const total = p.barras[p.barras.length - 1].x + p.barras[p.barras.length - 1].w - p.barras[0].x;

    expect(total).toBeLessThanOrEqual(larguraEmModulos('000042') * p.moduloMm + 1e-9);
  });

  it('rejeita código inválido e tamanho inválido', () => {
    expect(() => planoDaEtiqueta({ ...ETIQUETA, codigo: '' }, PRESET_NIMBOT_D110)).toThrow();
    expect(() => planoDaEtiqueta(ETIQUETA, { larguraMm: 0, alturaMm: 15 })).toThrow();
  });
});

describe('textos', () => {
  it('ajustarTexto corta nomes longos com reticências e normaliza espaços', () => {
    const longo = 'Colar corrente veneziana banhado a ouro 18k com pingente de coração';
    const r = ajustarTexto(longo, 28, 2.4);

    expect(r.length).toBeLessThan(longo.length);
    expect(r.endsWith('…')).toBe(true);
    expect(ajustarTexto('  Brinco   curto ', 28, 2.4)).toBe('Brinco curto');
    expect(ajustarTexto(null, 28, 2.4)).toBe('');
  });

  it('formatarPrecoEtiqueta usa vírgula e rejeita valores inválidos', () => {
    expect(formatarPrecoEtiqueta(49.9)).toBe('R$ 49,90');
    expect(formatarPrecoEtiqueta('1200')).toBe('R$ 1200,00');
    for (const ruim of [null, undefined, '', 'abc', -1, NaN]) expect(formatarPrecoEtiqueta(ruim)).toBe('');
  });
});

describe('folha A4', () => {
  it('o preset padrão cabe na folha', () => {
    expect(validarFolha(PRESET_FOLHA_A4)).toBe('');
  });

  it('avisa quando as colunas ou linhas passam da folha, ou os campos são inválidos', () => {
    expect(validarFolha({ ...PRESET_FOLHA_A4, colunas: 6 })).toMatch(/largura/);
    expect(validarFolha({ ...PRESET_FOLHA_A4, linhas: 14 })).toMatch(/altura/);
    expect(validarFolha({ ...PRESET_FOLHA_A4, colunas: 0 })).toMatch(/inteiros/);
    expect(validarFolha({ ...PRESET_FOLHA_A4, larguraMm: NaN })).toMatch(/números/);
  });

  it('posições seguem a ordem de leitura e quebram de página', () => {
    const cfg = { ...PRESET_FOLHA_A4, colunas: 2, linhas: 2, larguraMm: 30, alturaMm: 15, espacoHorizontalMm: 2, espacoVerticalMm: 1, margemEsquerdaMm: 5, margemTopoMm: 10 };
    const pos = posicoesNaFolha(5, cfg);

    expect(pos[0]).toEqual({ pagina: 0, x: 5, y: 10 });
    expect(pos[1]).toEqual({ pagina: 0, x: 37, y: 10 });
    expect(pos[2]).toEqual({ pagina: 0, x: 5, y: 26 });
    expect(pos[4]).toEqual({ pagina: 1, x: 5, y: 10 });
  });

  it('posição inicial pula etiquetas já usadas e vira a página quando passa do fim da folha', () => {
    const cfg = { ...PRESET_FOLHA_A4, colunas: 2, linhas: 2, larguraMm: 30, alturaMm: 15, espacoHorizontalMm: 2, espacoVerticalMm: 1, margemEsquerdaMm: 5, margemTopoMm: 10 };
    const pos = posicoesNaFolha(3, { ...cfg, posicaoInicial: 3 });

    expect(pos[0]).toEqual({ pagina: 0, x: 5, y: 26 });
    expect(pos[1]).toEqual({ pagina: 0, x: 37, y: 26 });
    expect(pos[2]).toEqual({ pagina: 1, x: 5, y: 10 });
    expect(posicoesNaFolha(1, { ...cfg, posicaoInicial: 4 })[0]).toEqual({ pagina: 0, x: 37, y: 26 });
    expect(posicoesNaFolha(1, cfg)[0]).toEqual({ pagina: 0, x: 5, y: 10 });
  });

  it('valida a posição inicial (inteiro de 1 até colunas x linhas)', () => {
    expect(validarFolha({ ...PRESET_FOLHA_A4, posicaoInicial: 65 })).toBe('');
    expect(validarFolha({ ...PRESET_FOLHA_A4, posicaoInicial: 66 })).toMatch(/posição inicial/);
    expect(validarFolha({ ...PRESET_FOLHA_A4, posicaoInicial: 0 })).toMatch(/posição inicial/);
    expect(validarFolha({ ...PRESET_FOLHA_A4, posicaoInicial: 2.5 })).toMatch(/posição inicial/);
    expect(validarFolha({ ...PRESET_FOLHA_A4, posicaoInicial: NaN })).toMatch(/posição inicial/);
  });

  it('expandirCopias repete cada item e limita as cópias (0..999)', () => {
    const lista = expandirCopias([{ ...ETIQUETA, copias: 3 }, { ...ETIQUETA, codigo: '000043', copias: 0 }, { ...ETIQUETA, codigo: '000044', copias: 5000 }]);

    expect(lista.filter((e) => e.codigo === '000042')).toHaveLength(3);
    expect(lista.some((e) => e.codigo === '000043')).toBe(false);
    expect(lista.filter((e) => e.codigo === '000044')).toHaveLength(999);
  });
});
