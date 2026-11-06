import { jsPDF } from 'jspdf';
import { totalDeUnidades } from './transferencias';
import { formatarDataHora } from './formatarData';

// Romaneio de transferência: folha A4 que acompanha as peças entre dois locais de estoque.
// Só usa dados que a API já devolve em GET /estoque/transferencias/:id. Não traz preço nem custo.

// Só transferências em andamento ou concluídas têm romaneio; recusada/cancelada não movimenta peças.
export function podeImprimirRomaneio(t) {
  return Boolean(t) && (t.status === 'pendente' || t.status === 'concluida') && (t.itens?.length ?? 0) > 0;
}

export function nomeArquivoRomaneio(t) {
  return `romaneio-transferencia-${t.id}.pdf`;
}

// Dados já formatados, sem depender de jsPDF (testável).
export function montarDadosRomaneio(t, { empresa = '' } = {}) {
  return {
    empresa: empresa || 'VERTUMNO',
    titulo: `Romaneio de transferência nº ${t.id}`,
    emitidoEm: formatarDataHora(t.criado_em),
    origem: t.origem_nome ?? '—',
    destino: t.destino_nome ?? '—',
    criadoPor: t.criado_por_nome ?? '—',
    itens: (t.itens ?? []).map(i => ({
      sku: i.produto_sku || '—',
      produto: i.produto_nome ?? '—',
      quantidade: Number(i.quantidade ?? 0),
    })),
    total: totalDeUnidades(t.itens),
    observacao: t.observacao ?? '',
    recebedor: t.destino_nome ?? '',
  };
}

const MARGEM = 15;
const LARGURA = 210;
const ALTURA = 297;
const RODAPE_RESERVA = 50; // espaço para total + assinatura

export function gerarPdfRomaneio(t, opcoes = {}) {
  const d = montarDadosRomaneio(t, opcoes);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const xQtd = LARGURA - MARGEM;
  let y = MARGEM + 5;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(d.empresa, MARGEM, y);
  y += 8;
  doc.setFontSize(16);
  doc.text(d.titulo, MARGEM, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  [['Data', d.emitidoEm], ['Origem', d.origem], ['Destino', d.destino], ['Criada por', d.criadoPor]].forEach(([rotulo, valor]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${rotulo}:`, MARGEM, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(valor), MARGEM + 22, y);
    y += 5.5;
  });
  y += 4;

  const cabecalhoTabela = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SKU', MARGEM, y);
    doc.text('Produto', MARGEM + 35, y);
    doc.text('Qtd.', xQtd, y, { align: 'right' });
    doc.setLineWidth(0.3);
    doc.line(MARGEM, y + 1.8, xQtd, y + 1.8);
    y += 7;
    doc.setFont('helvetica', 'normal');
  };
  cabecalhoTabela();

  d.itens.forEach(item => {
    if (y > ALTURA - MARGEM - RODAPE_RESERVA) {
      doc.addPage();
      y = MARGEM + 5;
      cabecalhoTabela();
    }
    const linhas = doc.splitTextToSize(item.produto, xQtd - (MARGEM + 35) - 18);
    doc.text(item.sku, MARGEM, y);
    doc.text(linhas, MARGEM + 35, y);
    doc.text(String(item.quantidade), xQtd, y, { align: 'right' });
    y += 5.5 * linhas.length + 1;
  });

  if (y > ALTURA - MARGEM - RODAPE_RESERVA) {
    doc.addPage();
    y = MARGEM + 5;
  }
  doc.line(MARGEM, y - 3, xQtd, y - 3);
  doc.setFont('helvetica', 'bold');
  doc.text('Total de peças', MARGEM, y + 2);
  doc.text(String(d.total), xQtd, y + 2, { align: 'right' });
  y += 12;

  if (d.observacao) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observação:', MARGEM, y);
    doc.setFont('helvetica', 'normal');
    const obs = doc.splitTextToSize(d.observacao, xQtd - MARGEM);
    doc.text(obs, MARGEM, y + 5.5);
    y += 5.5 * obs.length + 9;
  }

  // Assinatura só de quem recebe.
  const yAss = Math.max(y + 18, ALTURA - MARGEM - 20);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, yAss, MARGEM + 90, yAss);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Recebido por: ${d.recebedor}`, MARGEM, yAss + 5);
  doc.text('Data: ____/____/________', MARGEM + 110, yAss + 5);

  return doc;
}
