import { describe, it, expect } from 'vitest';
import { moverIndice, fotosVisiveis, direcaoDoSwipe } from './carrosselFotos';

describe('utils/carrosselFotos', () => {
  it('moverIndice avança e volta ao início', () => {
    expect(moverIndice(0, 1, 3)).toBe(1);
    expect(moverIndice(2, 1, 3)).toBe(0);
  });

  it('moverIndice volta ao fim ao retroceder do primeiro', () => {
    expect(moverIndice(0, -1, 3)).toBe(2);
  });

  it('moverIndice com total 0 devolve 0', () => {
    expect(moverIndice(0, 1, 0)).toBe(0);
  });

  it('fotosVisiveis descarta fotos sem url e entradas inválidas', () => {
    const lista = [{ id: 1, url: 'https://x/1.webp' }, { id: 2, url: null }, null, { id: 3, url: '' }];
    expect(fotosVisiveis(lista).map(f => f.id)).toEqual([1]);
    expect(fotosVisiveis(undefined)).toEqual([]);
  });

  it('direcaoDoSwipe respeita o limite e o sentido', () => {
    expect(direcaoDoSwipe(-80)).toBe(1);
    expect(direcaoDoSwipe(80)).toBe(-1);
    expect(direcaoDoSwipe(-10)).toBe(0);
  });
});
