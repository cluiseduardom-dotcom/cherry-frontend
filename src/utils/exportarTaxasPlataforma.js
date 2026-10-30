// Exportação do fechamento mensal "Taxas a receber" (operador da plataforma): CSV para Excel e PDF.
// Só formata o que a API já devolve; nenhum cálculo novo. As partes puras (tabela, CSV, nome do arquivo)
// são testáveis sem DOM; o PDF e o download ficam nas funções do fim.
import { rotuloMes, formatarPercentuais } from './plataforma';

export const CABECALHO_TAXAS = ['Loja', 'Vendas', 'Base das vendas', 'Percentual', 'Taxa total', 'Retido no Mercado Pago', 'Taxa a receber'];

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Valor monetário no padrão pt-BR sem símbolo (o Excel pt-BR entende "1234,50").
export function numeroBR(v) {
  return num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
}

function reais(v) {
  return num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// { cabecalho, linhas, totais } com valores brutos (números), na ordem de CABECALHO_TAXAS.
export function montarTabelaTaxas(dados) {
  const items = Array.isArray(dados?.items) ? dados.items : [];
  const linhas = items
    .filter(i => num(i.qtd_vendas) > 0 || num(i.qtd_estornadas) > 0)
    .map(i => ({
      loja: String(i.empresa_nome ?? ''),
      vendas: num(i.qtd_vendas),
      base: num(i.total_base),
      percentual: formatarPercentuais(i.percentuais),
      taxaTotal: num(i.total_taxa),
      retido: num(i.total_cobrado_gateway),
      aReceber: num(i.total_a_receber ?? i.total_taxa),
      estornadas: num(i.qtd_estornadas),
    }));

  const t = dados?.totais ?? {};
  const totais = {
    vendas: num(t.qtd_vendas),
    base: num(t.total_base),
    taxaTotal: num(t.total_taxa),
    retido: num(t.total_cobrado_gateway),
    aReceber: num(t.total_a_receber ?? t.total_taxa),
  };

  return { cabecalho: CABECALHO_TAXAS, linhas, totais };
}

// Texto que o Excel poderia interpretar como fórmula ganha um apóstrofo na frente (injeção de CSV).
function seguro(texto) {
  const s = String(texto);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function celulaCsv(valor) {
  const s = String(valor);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV pensado para abrir direto no Excel em português: separador ";", vírgula decimal, BOM UTF-8
// (acentos corretos), linhas com CRLF.
export function gerarCsvTaxas(dados, mes) {
  const { cabecalho, linhas, totais } = montarTabelaTaxas(dados);
  const linhasCsv = [
    [`Taxas a receber - ${rotuloMes(mes)}`],
    cabecalho,
    ...linhas.map(l => [seguro(l.loja), l.vendas, numeroBR(l.base), l.percentual, numeroBR(l.taxaTotal), numeroBR(l.retido), numeroBR(l.aReceber)]),
    ['Total', totais.vendas, numeroBR(totais.base), '', numeroBR(totais.taxaTotal), numeroBR(totais.retido), numeroBR(totais.aReceber)],
  ];

  return `﻿${linhasCsv.map(l => l.map(celulaCsv).join(';')).join('\r\n')}\r\n`;
}

export function nomeArquivoTaxas(mes, extensao) {
  return `taxas-a-receber-${mes}.${extensao}`;
}

function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportarTaxasCsv(dados, mes) {
  baixar(new Blob([gerarCsvTaxas(dados, mes)], { type: 'text/csv;charset=utf-8' }), nomeArquivoTaxas(mes, 'csv'));
}

export async function exportarTaxasPdf(dados, mes, agora = new Date()) {
  const { default: jsPDF } = await import('jspdf');
  const { linhas, totais } = montarTabelaTaxas(dados);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margem = 40;
  const colunas = [
    { rotulo: 'Loja', x: margem, alinhar: 'left' },
    { rotulo: 'Vendas', x: 360, alinhar: 'right' },
    { rotulo: 'Base das vendas', x: 460, alinhar: 'right' },
    { rotulo: 'Percentual', x: 520, alinhar: 'left' },
    { rotulo: 'Taxa total', x: 680, alinhar: 'right' },
    { rotulo: 'Retido no MP', x: 755, alinhar: 'right' },
    { rotulo: 'A receber', x: 802, alinhar: 'right' },
  ];
  const celulas = l => [l.loja, String(l.vendas), reais(l.base), l.percentual, reais(l.taxaTotal), reais(l.retido), reais(l.aReceber)];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Taxas a receber - Vertumno', margem, 50);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const geradoEm = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(agora);
  pdf.text(`${rotuloMes(mes)} | gerado em ${geradoEm} (horario de Brasilia)`, margem, 68);

  let y = 98;
  const linhaCabecalho = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    colunas.forEach(c => pdf.text(c.rotulo, c.x, y, { align: c.alinhar }));
    pdf.line(margem, y + 4, 802, y + 4);
    y += 20;
    pdf.setFont('helvetica', 'normal');
  };
  linhaCabecalho();

  for (const l of linhas) {
    if (y > 540) { pdf.addPage(); y = 50; linhaCabecalho(); }
    celulas(l).forEach((texto, i) => {
      const c = colunas[i];
      pdf.text(i === 0 ? pdf.splitTextToSize(texto, 300)[0] : texto, c.x, y, { align: c.alinhar });
    });
    y += 16;
  }

  if (y > 520) { pdf.addPage(); y = 50; }
  pdf.line(margem, y - 6, 802, y - 6);
  pdf.setFont('helvetica', 'bold');
  const totalLinha = ['Total', String(totais.vendas), reais(totais.base), '', reais(totais.taxaTotal), reais(totais.retido), reais(totais.aReceber)];
  totalLinha.forEach((texto, i) => pdf.text(texto, colunas[i].x, y + 8, { align: colunas[i].alinhar }));

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Valores apurados no momento de cada venda, com o percentual vigente na data. Vendas canceladas nao entram. O que o Mercado Pago ja reteve nos Pix do PDV e abatido.', margem, y + 34);

  pdf.save(nomeArquivoTaxas(mes, 'pdf'));
}
