import { describe, it, expect } from 'vitest';
import { montarTabelaTaxas, gerarCsvTaxas, nomeArquivoTaxas, numeroBR, CABECALHO_TAXAS } from './exportarTaxasPlataforma';

const dados = {
  items: [
    { empresa_id: 1, empresa_nome: 'Cherry Semijoias', qtd_vendas: 3, total_base: '60.00', percentuais: [0.15, 0.5], total_taxa: '0.23', total_cobrado_gateway: '0.03', total_a_receber: '0.20', qtd_estornadas: 1, total_estornado: '20.00' },
    { empresa_id: 2, empresa_nome: 'Sem movimento', qtd_vendas: 0, total_base: '0.00', percentuais: [], total_taxa: '0.00', total_cobrado_gateway: '0.00', total_a_receber: '0.00', qtd_estornadas: 0, total_estornado: '0.00' },
    { empresa_id: 3, empresa_nome: '=HYPERLINK("http://x")', qtd_vendas: 1, total_base: '1234.5', percentuais: [0.5], total_taxa: '6.17', total_cobrado_gateway: '0', total_a_receber: '6.17', qtd_estornadas: 0, total_estornado: '0' },
  ],
  totais: { qtd_vendas: 4, total_base: '1294.50', total_taxa: '6.40', total_cobrado_gateway: '0.03', total_a_receber: '6.37' },
};

describe('numeroBR', () => {
  it('vírgula decimal, sem milhar e sem símbolo; entrada inválida vira 0,00', () => {
    expect(numeroBR('1234.5')).toBe('1234,50');
    expect(numeroBR(0.2)).toBe('0,20');
    expect(numeroBR(undefined)).toBe('0,00');
    expect(numeroBR('abc')).toBe('0,00');
  });
});

describe('montarTabelaTaxas', () => {
  it('ignora loja sem movimento, usa total_a_receber e traz os totais', () => {
    const { cabecalho, linhas, totais } = montarTabelaTaxas(dados);
    expect(cabecalho).toEqual(CABECALHO_TAXAS);
    expect(linhas.map(l => l.loja)).toEqual(['Cherry Semijoias', '=HYPERLINK("http://x")']);
    expect(linhas[0]).toMatchObject({ vendas: 3, base: 60, taxaTotal: 0.23, retido: 0.03, aReceber: 0.2, estornadas: 1 });
    expect(totais).toEqual({ vendas: 4, base: 1294.5, taxaTotal: 6.4, retido: 0.03, aReceber: 6.37 });
  });

  it('API antiga sem total_a_receber cai em total_taxa; entrada vazia não quebra', () => {
    const { linhas } = montarTabelaTaxas({ items: [{ empresa_nome: 'X', qtd_vendas: 1, total_taxa: '0.5' }], totais: {} });
    expect(linhas[0].aReceber).toBe(0.5);
    expect(montarTabelaTaxas(undefined)).toMatchObject({ linhas: [], totais: { vendas: 0, aReceber: 0 } });
  });
});

describe('gerarCsvTaxas', () => {
  const csv = gerarCsvTaxas(dados, '2026-10');
  const linhas = csv.split('\r\n');

  it('começa com BOM UTF-8, usa ";" e CRLF, título com o mês', () => {
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(linhas[0]).toBe('﻿Taxas a receber - Outubro de 2026');
    expect(linhas[1]).toBe(CABECALHO_TAXAS.join(';'));
  });

  it('valores em pt-BR (vírgula decimal); a vírgula não precisa de aspas porque o separador é ";"', () => {
    expect(linhas[2]).toBe('Cherry Semijoias;3;60,00;0,15% e 0,50%;0,23;0,03;0,20');
  });

  it('nome que pareceria fórmula ganha apóstrofo (injeção de CSV)', () => {
    expect(linhas[3].startsWith('"\'=HYPERLINK(""http://x"")";1;1234,50;')).toBe(true);
  });

  it('linha de total no fim', () => {
    expect(linhas[4]).toBe('Total;4;1294,50;;6,40;0,03;6,37');
  });
});

describe('nomeArquivoTaxas', () => {
  it('inclui o mês e a extensão', () => {
    expect(nomeArquivoTaxas('2026-10', 'pdf')).toBe('taxas-a-receber-2026-10.pdf');
  });
});
