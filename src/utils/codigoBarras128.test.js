import { describe, it, expect } from 'vitest';
import { barrasCode128, codigoValidoParaEtiqueta, larguraEmModulos, modulosCode128, simbolosCode128 } from './codigoBarras128.js';

// Referências geradas pela biblioteca python-barcode (Code 128). Além disso, as imagens produzidas por este
// encoder foram decodificadas com um leitor real (zxing-cpp) para 16 códigos diferentes: todos leram igual.
describe('Code 128', () => {
  it('código interno só de dígitos (subconjunto C, 6 dígitos) bate com a referência', () => {
    expect(modulosCode128('000042')).toBe('11010011100110110011001101100110010110111000111001011001100011101011');
  });

  it('texto com letras (subconjunto B) bate com a referência', () => {
    expect(modulosCode128('ABC-123')).toBe('1101001000010100011000100010110001000100011010011011100100111001101100111001011001011100101100001001100011101011');
  });

  it('dígitos pares usam C (2 dígitos por símbolo) e ímpares usam B + C', () => {
    expect(simbolosCode128('000042')).toEqual([105, 0, 0, 42]);
    expect(simbolosCode128('12345')).toEqual([104, 17, 99, 23, 45]);
    expect(simbolosCode128('12')).toEqual([104, 17, 18]);
  });

  it('largura = 11 módulos por símbolo (+ verificador) + parada de 13', () => {
    expect(larguraEmModulos('000042')).toBe((4 + 1) * 11 + 13);
    expect(larguraEmModulos('ABC-123')).toBe((8 + 1) * 11 + 13);
  });

  it('as barras cobrem exatamente os módulos pretos', () => {
    const modulos = modulosCode128('000042');
    const barras = barrasCode128('000042');
    const reconstruido = Array(modulos.length).fill('0');

    for (const [inicio, largura] of barras) for (let i = 0; i < largura; i += 1) reconstruido[inicio + i] = '1';

    expect(reconstruido.join('')).toBe(modulos);
  });

  it('rejeita vazio, acento, texto longo demais e não-texto', () => {
    for (const ruim of ['', 'açúcar', 'x'.repeat(41), null, undefined, 123, '\n']) {
      expect(codigoValidoParaEtiqueta(ruim)).toBe(false);
    }
    expect(() => modulosCode128('açúcar')).toThrow();
    expect(codigoValidoParaEtiqueta('7891234567895')).toBe(true);
  });
});
