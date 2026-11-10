import { describe, it, expect } from 'vitest';
import { removerFundoLiso } from './removerFundoLiso';

// Imagem de teste: fundo de uma cor, com um "rosto" (círculo) de outra cor no meio.
function imagem(w, h, fundo, rosto, { ruido = 0, buraco = false } = {}) {
  const d = new Uint8ClampedArray(w * h * 4);
  let semente = 7;
  const aleatorio = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dentro = Math.hypot(x - w / 2, y - h / 2) < Math.min(w, h) * 0.28;
      const cor = dentro ? rosto : fundo;
      const i = (y * w + x) * 4;
      const r = ruido ? (aleatorio() - 0.5) * 2 * ruido : 0;
      d[i] = cor[0] + r; d[i + 1] = cor[1] + r; d[i + 2] = cor[2] + r; d[i + 3] = 255;
    }
  }

  if (buraco) { // um pedaço do fundo cercado pela pessoa (como o vão entre braço e corpo): não está ligado à borda
    for (let y = h / 2 - 2; y < h / 2 + 2; y += 1) for (let x = w / 2 - 2; x < w / 2 + 2; x += 1) { const i = (Math.floor(y) * w + Math.floor(x)) * 4; d[i] = fundo[0]; d[i + 1] = fundo[1]; d[i + 2] = fundo[2]; }
  }

  return d;
}

const alfa = (d, w, x, y) => d[(y * w + x) * 4 + 3];

describe('removerFundoLiso', () => {
  const W = 60;
  const H = 80;

  it('tira o fundo liso (e o ruído de JPEG) e mantém a pessoa', () => {
    const d = imagem(W, H, [67, 2, 22], [200, 150, 120], { ruido: 6 });
    const r = removerFundoLiso(d, W, H);

    expect(r.acao).toBe('removido');
    expect(r.fundo).toBeGreaterThan(0.5);
    expect(alfa(d, W, 0, 0)).toBe(0);
    expect(alfa(d, W, W - 1, H - 1)).toBe(0);
    expect(alfa(d, W, W / 2, H / 2)).toBe(255);
  });

  it('funciona com fundo claro também', () => {
    const d = imagem(W, H, [240, 240, 240], [60, 40, 30]);
    expect(removerFundoLiso(d, W, H).acao).toBe('removido');
    expect(alfa(d, W, 1, 1)).toBe(0);
    expect(alfa(d, W, W / 2, H / 2)).toBe(255);
  });

  it('o que não está ligado à borda não é tirado (não fura a pessoa)', () => {
    const d = imagem(W, H, [67, 2, 22], [200, 150, 120], { buraco: true });
    removerFundoLiso(d, W, H);
    expect(alfa(d, W, W / 2, H / 2)).toBe(255);
  });

  it('pessoa que encosta no rodapé e nos lados (busto): o fundo sai e o corpo fica', () => {
    const d = imagem(W, H, [67, 2, 22], [200, 150, 120]);
    // "ombros": corpo cobrindo a parte de baixo, de lado a lado
    for (let y = Math.floor(H * 0.7); y < H; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * W + x) * 4; d[i] = 120; d[i + 1] = 120; d[i + 2] = 125; }
    const r = removerFundoLiso(d, W, H);

    expect(r.acao).toBe('removido');
    expect(alfa(d, W, 0, 0)).toBe(0);
    expect(alfa(d, W, 0, H - 1)).toBe(255);
    expect(alfa(d, W, W / 2, H - 2)).toBe(255);
  });

  it('foto que já tem transparência fica como está', () => {
    const d = imagem(W, H, [67, 2, 22], [200, 150, 120]);
    for (let i = 3; i < d.length; i += 4) d[i] = 0;
    expect(removerFundoLiso(d, W, H).acao).toBe('ja_transparente');
  });

  it('fundo que não é liso (muito ruído/estampa) não é mexido', () => {
    const d = imagem(W, H, [128, 128, 128], [200, 150, 120], { ruido: 120 });
    const antes = Uint8ClampedArray.from(d);
    expect(removerFundoLiso(d, W, H).acao).toBe('fundo_complexo');
    expect(d).toEqual(antes);
  });

  it('se o "fundo" é a foto inteira (quase tudo da mesma cor), não apaga nada', () => {
    const d = imagem(W, H, [128, 128, 128], [128, 128, 128]);
    const antes = Uint8ClampedArray.from(d);
    expect(['excessivo', 'sem_fundo']).toContain(removerFundoLiso(d, W, H).acao);
    expect(d).toEqual(antes);
  });

  it('entrada inválida não quebra', () => {
    expect(removerFundoLiso(new Uint8ClampedArray(0), 0, 0).acao).toBe('sem_fundo');
  });
});
