import { describe, it, expect } from 'vitest';
import { podeImprimirRomaneio, nomeArquivoRomaneio, montarDadosRomaneio, gerarPdfRomaneio } from './romaneioTransferencia';

const base = {
  id: 7, status: 'pendente', origem_nome: 'Estoque central', destino_nome: 'Maleta da Ana',
  criado_por_nome: 'Luís', criado_em: '2026-11-03T15:00:00Z', observacao: 'Conferir fechos',
  itens: [
    { produto_id: 1, produto_nome: 'Brinco Pérola', produto_sku: 'BR-001', quantidade: 3 },
    { produto_id: 2, produto_nome: 'Colar', produto_sku: null, quantidade: 2 },
  ],
};

describe('podeImprimirRomaneio', () => {
  it('só pendente e concluída, com itens', () => {
    expect(podeImprimirRomaneio(base)).toBe(true);
    expect(podeImprimirRomaneio({ ...base, status: 'concluida' })).toBe(true);
    expect(podeImprimirRomaneio({ ...base, status: 'recusada' })).toBe(false);
    expect(podeImprimirRomaneio({ ...base, status: 'cancelada' })).toBe(false);
    expect(podeImprimirRomaneio({ ...base, itens: [] })).toBe(false);
    expect(podeImprimirRomaneio(null)).toBe(false);
  });
});

describe('montarDadosRomaneio', () => {
  it('monta cabeçalho, itens e total, sem preço', () => {
    const d = montarDadosRomaneio(base, { empresa: 'Cherry Semijoias' });
    expect(d.empresa).toBe('Cherry Semijoias');
    expect(d.titulo).toBe('Romaneio de transferência nº 7');
    expect(d.origem).toBe('Estoque central');
    expect(d.recebedor).toBe('Maleta da Ana');
    expect(d.total).toBe(5);
    expect(d.itens[1]).toEqual({ sku: '—', produto: 'Colar', quantidade: 2 });
    expect(JSON.stringify(d)).not.toMatch(/preco|custo/i);
  });

  it('usa VERTUMNO quando a empresa não é informada', () => {
    expect(montarDadosRomaneio(base).empresa).toBe('VERTUMNO');
  });
});

describe('nomeArquivoRomaneio / gerarPdfRomaneio', () => {
  it('nome do arquivo usa o número', () => {
    expect(nomeArquivoRomaneio(base)).toBe('romaneio-transferencia-7.pdf');
  });

  it('gera PDF A4; lista longa quebra em mais de uma página', () => {
    expect(gerarPdfRomaneio(base).getNumberOfPages()).toBe(1);
    const longa = { ...base, itens: Array.from({ length: 80 }, (_, i) => ({ produto_id: i, produto_nome: `Produto ${i}`, produto_sku: `S${i}`, quantidade: 1 })) };
    expect(gerarPdfRomaneio(longa).getNumberOfPages()).toBeGreaterThan(1);
  });
});
