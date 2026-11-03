import { describe, it, expect } from 'vitest';
import { cameraSuportada, criarDetector, criarFiltroRepeticao, FORMATOS_LEITURA } from './leitorCodigoBarras';

describe('cameraSuportada', () => {
  it('depende só de getUserMedia (o leitor vem da biblioteca quando não há nativo)', () => {
    expect(cameraSuportada({ mediaDevices: { getUserMedia: () => {} } })).toBe(true);
    expect(cameraSuportada({ mediaDevices: {} })).toBe(false);
    expect(cameraSuportada({})).toBe(false);
    expect(cameraSuportada(undefined)).toBe(false);
  });
});

describe('criarDetector', () => {
  it('usa o BarcodeDetector nativo quando ele lê Code 128, só com formatos suportados', async () => {
    const criados = [];
    class Nativo {
      constructor(opcoes) { this.opcoes = opcoes; criados.push(this); }
      static async getSupportedFormats() { return ['code_128', 'ean_13', 'qr_code']; }
    }
    const d = await criarDetector({ BarcodeDetector: Nativo });
    expect(d).toBe(criados[0]);
    expect(d.opcoes.formats).toEqual(['code_128', 'ean_13']);
    expect(FORMATOS_LEITURA).toContain('code_128');
  });
});

describe('criarFiltroRepeticao', () => {
  it('ignora o mesmo código dentro do intervalo, aceita outro código ou depois do intervalo', () => {
    let t = 0;
    const aceitar = criarFiltroRepeticao(2500, () => t);
    expect(aceitar('000002')).toBe(true);
    t = 1000;
    expect(aceitar('000002')).toBe(false);
    expect(aceitar('000003')).toBe(true);
    t = 1500;
    expect(aceitar('000002')).toBe(true);
    t = 5000;
    expect(aceitar('000002')).toBe(true);
  });
});
