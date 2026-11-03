import { describe, it, expect } from 'vitest';
import { crc32, gerarXlsx } from './xlsxSimples';
import { linhasExcelNimbot } from './etiquetaProduto';

const texto = (bytes) => new TextDecoder().decode(bytes);

describe('crc32', () => {
  it('confere com o valor de referência', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('gerarXlsx', () => {
  it('gera um ZIP com as partes do xlsx e células de texto (zeros à esquerda preservados)', () => {
    const bytes = gerarXlsx([['Nome', 'Codigo'], ['teste01', '000002'], ['A & <B>', '000010']]);
    const conteudo = texto(bytes);

    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
    for (const parte of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/sharedStrings.xml', 'xl/styles.xml']) {
      expect(conteudo).toContain(parte);
    }
    expect(conteudo).toContain('<t xml:space="preserve">000002</t>');
    expect(conteudo).toContain('A &amp; &lt;B&gt;');
    expect(conteudo).toContain('<c r="B2" t="s">');
    expect(conteudo).not.toMatch(/<c r="B2"[^>]*><v>2<\/v>/);
  });
});

describe('linhasExcelNimbot', () => {
  const itens = [
    { nome: 'teste01', codigo: '000002', preco: 5.5, copias: 2 },
    { nome: '  Colar   Fina ', codigo: '000010', preco: null, copias: 1 },
    { nome: 'zero', codigo: '000011', preco: 1, copias: 0 },
  ];

  it('cabeçalho + uma linha por cópia, preço formatado', () => {
    expect(linhasExcelNimbot(itens)).toEqual([
      ['Nome', 'Codigo', 'Preco'],
      ['teste01', '000002', 'R$ 5,50'],
      ['teste01', '000002', 'R$ 5,50'],
      ['Colar Fina', '000010', ''],
    ]);
  });

  it('sem preço (opção desligada) a coluna Preco não entra', () => {
    expect(linhasExcelNimbot(itens, { mostrarPreco: false })[0]).toEqual(['Nome', 'Codigo']);
  });
});
