import { describe, it, expect } from 'vitest';
import { calcularRecorte, focoDoRecorte, limitarZoom, moverFoco, posicaoNaJanela, LADO_PERFIL, ZOOM_MAXIMO } from './fotoPerfil';

describe('limitarZoom', () => {
  it('fica entre 1 e o máximo e ignora valores inválidos', () => {
    expect(limitarZoom(0.2)).toBe(1);
    expect(limitarZoom(2.5)).toBe(2.5);
    expect(limitarZoom(99)).toBe(ZOOM_MAXIMO);
    expect(limitarZoom(NaN)).toBe(1);
    expect(limitarZoom(undefined)).toBe(1);
  });
});

describe('calcularRecorte', () => {
  it('zoom 1 pega o maior quadrado centralizado (paisagem e retrato)', () => {
    expect(calcularRecorte({ largura: 400, altura: 200 })).toEqual({ sx: 100, sy: 0, lado: 200 });
    expect(calcularRecorte({ largura: 200, altura: 400 })).toEqual({ sx: 0, sy: 100, lado: 200 });
  });

  it('com zoom o quadrado encolhe e o foco o move, sempre dentro da imagem', () => {
    expect(calcularRecorte({ largura: 400, altura: 200, zoom: 2, focoX: 0.5, focoY: 0.5 })).toEqual({ sx: 150, sy: 50, lado: 100 });
    expect(calcularRecorte({ largura: 400, altura: 200, zoom: 2, focoX: 0, focoY: 0 })).toEqual({ sx: 0, sy: 0, lado: 100 });
    expect(calcularRecorte({ largura: 400, altura: 200, zoom: 2, focoX: 1, focoY: 1 })).toEqual({ sx: 300, sy: 100, lado: 100 });
  });

  it('imagem sem tamanho válido não tem recorte', () => {
    expect(calcularRecorte({ largura: 0, altura: 100 })).toBeNull();
    expect(calcularRecorte({ largura: 100, altura: NaN })).toBeNull();
  });

  it('o resultado final tem 512 px', () => {
    expect(LADO_PERFIL).toBe(512);
  });
});

describe('moverFoco', () => {
  const base = { largura: 400, altura: 200, zoom: 2, focoX: 0.5, focoY: 0.5 };

  it('arrastar para a direita mostra mais da esquerda da imagem (foco diminui)', () => {
    const { focoX } = moverFoco(base, 50, 0, 100); // janela 100px, recorte 100px da imagem: escala 1
    expect(focoX).toBeCloseTo((200 - 50) / 400);
  });

  it('não passa dos limites da imagem', () => {
    const r = moverFoco(base, 10000, 10000, 100);
    expect(r.focoX).toBeCloseTo(50 / 400);
    expect(r.focoY).toBeCloseTo(50 / 200);
  });

  it('janela inválida mantém o foco', () => {
    expect(moverFoco(base, 10, 10, 0)).toEqual({ focoX: 0.5, focoY: 0.5 });
  });
});

describe('posicaoNaJanela', () => {
  it('escala a imagem inteira para a janela e a desloca pelo recorte', () => {
    const recorte = calcularRecorte({ largura: 400, altura: 200, zoom: 2 }); // sx 150, sy 50, lado 100
    expect(posicaoNaJanela({ largura: 400, altura: 200 }, recorte, 200)).toEqual({ left: -300, top: -100, width: 800, height: 400 });
  });
});

describe('focoDoRecorte', () => {
  it('é o inverso do cálculo do recorte', () => {
    const dim = { largura: 400, altura: 200 };
    const recorte = calcularRecorte({ ...dim, zoom: 2, focoX: 0.3, focoY: 0.6 });
    const { focoX, focoY } = focoDoRecorte(dim, recorte);
    expect(calcularRecorte({ ...dim, zoom: 2, focoX, focoY })).toEqual(recorte);
  });
});
