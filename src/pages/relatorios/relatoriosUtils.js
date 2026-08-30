import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Datas do backend chegam como 'YYYY-MM-DD' (ou isso + timestamp) — nunca usar
// `new Date(iso)` direto pra formatar, senão o driver/fuso pode exibir um dia
// a menos (mesmo cuidado já documentado pro financeiro no backend).
export function formatDateBR(value) {
  if (!value) return '—';
  const [ano, mes, dia] = String(value).slice(0, 10).split('-');
  if (!ano || !mes || !dia) return '—';
  return `${dia}/${mes}/${ano}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function isoDaysFromToday(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toISODate(d);
}

// Constrói um Date local (meio-dia, pra evitar cair no dia anterior por causa
// de fuso) a partir de uma string 'YYYY-MM-DD'.
export function parseISOLocal(iso) {
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1, 12, 0, 0);
}

export function diasEntre(isoInicio, isoFim) {
  const inicio = parseISOLocal(isoInicio);
  const fim = parseISOLocal(isoFim);
  return Math.round((fim - inicio) / 86400000);
}

// Dias em aberto a partir de hoje: positivo = já venceu há N dias, negativo = vence em N dias.
export function diasEmAberto(dataVencimentoISO) {
  return diasEntre(dataVencimentoISO, todayISO());
}

export function weekdayLabel(iso) {
  return WEEKDAY_LABELS[parseISOLocal(iso).getDay()];
}

// Lista todos os dias (ISO) entre inicio e fim, inclusive.
export function listarDiasNoPeriodo(isoInicio, isoFim) {
  const dias = [];
  const cursor = parseISOLocal(isoInicio);
  const fim = parseISOLocal(isoFim);
  while (cursor <= fim) {
    dias.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

// Percorre todas as páginas de um endpoint paginado (padrão já usado em
// ContasPagar/ContasReceber) e retorna a lista completa de itens.
export async function buscarTodasAsPaginas(fetchPage, params = {}) {
  let pagina = 1;
  let totalPaginas = 1;
  let itens = [];

  do {
    const data = await fetchPage({ ...params, page: pagina, pageSize: 100 });
    itens = itens.concat(data.items);
    totalPaginas = data.totalPages;
    pagina += 1;
  } while (pagina <= totalPaginas);

  return itens;
}

const PDF_MARGIN = 20;
const PDF_HEADER_HEIGHT = 78;
const PDF_FOOTER_HEIGHT = 26;
const PRIMARY_RGB = [167, 6, 54];
const LOGO_URL = '/cherry-logo.jpg';
const LOGO_SIZE = 22;

// Carrega o logo (cereja) uma única vez e cacheia como dataURL PNG, já que
// jsPDF#addImage precisa de dados de imagem já carregados (não aceita URL).
let logoDataUrlPromise = null;
function carregarLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = LOGO_URL;
    });
  }
  return logoDataUrlPromise;
}

function desenharCabecalho(pdf, { titulo, periodoLabel, pageWidth, logoDataUrl }) {
  const textoX = logoDataUrl ? PDF_MARGIN + LOGO_SIZE + 8 : PDF_MARGIN;

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', PDF_MARGIN, 12, LOGO_SIZE, LOGO_SIZE);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(...PRIMARY_RGB);
  pdf.text('Cherry Semijoias', textoX, 27);

  pdf.setFontSize(13);
  pdf.text(titulo, PDF_MARGIN, 46);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(60, 60, 60);
  pdf.text(periodoLabel, PDF_MARGIN, 62);

  pdf.setDrawColor(...PRIMARY_RGB);
  pdf.setLineWidth(1);
  pdf.line(PDF_MARGIN, PDF_HEADER_HEIGHT - 8, pageWidth - PDF_MARGIN, PDF_HEADER_HEIGHT - 8);
}

function desenharRodape(pdf, { pageWidth, pageHeight, pagina, totalPaginas, logoDataUrl }) {
  const dataExportacao = new Date().toLocaleDateString('pt-BR');

  if (logoDataUrl) {
    const tamanho = 12;
    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity: 0.25 }));
    pdf.addImage(logoDataUrl, 'PNG', PDF_MARGIN, pageHeight - 10 - tamanho + 2, tamanho, tamanho);
    pdf.restoreGraphicsState();
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(130, 130, 130);
  const textoX = logoDataUrl ? PDF_MARGIN + 16 : PDF_MARGIN;
  pdf.text(`© GiroOne 2026 · Exportado em ${dataExportacao}`, textoX, pageHeight - 10);
  pdf.text(`Página ${pagina} de ${totalPaginas}`, pageWidth - PDF_MARGIN, pageHeight - 10, { align: 'right' });
}

// Captura o container do relatório (KPIs + tabela + gráfico) como imagem e
// monta um PDF paginado: página 1 com header (logo + título + período),
// conteúdo fatiado nas páginas seguintes, rodapé com copyright em todas.
export async function exportarRelatorioPDF({ elementId, filename, titulo, periodoLabel }) {
  const elemento = document.getElementById(elementId);
  if (!elemento) {
    throw new Error('Não foi possível localizar o conteúdo do relatório para exportar.');
  }

  const [canvas, logoDataUrl] = await Promise.all([
    html2canvas(elemento, {
      scale: 2,
      backgroundColor: '#FFFFFF',
      useCORS: true,
    }),
    carregarLogoDataUrl(),
  ]);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGIN * 2;
  const pxPerPt = canvas.width / contentWidth;

  const firstPageContentHeightPx = (pageHeight - PDF_MARGIN - PDF_HEADER_HEIGHT - PDF_MARGIN - PDF_FOOTER_HEIGHT) * pxPerPt;
  const otherPageContentHeightPx = (pageHeight - PDF_MARGIN - PDF_MARGIN - PDF_FOOTER_HEIGHT) * pxPerPt;

  function contarPaginas() {
    let restante = canvas.height;
    let count = 0;
    let primeira = true;
    while (restante > 0) {
      const disponivel = primeira ? firstPageContentHeightPx : otherPageContentHeightPx;
      restante -= disponivel;
      count += 1;
      primeira = false;
    }
    return Math.max(1, count);
  }

  const totalPaginas = contarPaginas();

  let renderizadoPx = 0;
  let pagina = 0;

  while (renderizadoPx < canvas.height) {
    const primeira = pagina === 0;
    const disponivelPx = primeira ? firstPageContentHeightPx : otherPageContentHeightPx;
    const fatiaPx = Math.min(disponivelPx, canvas.height - renderizadoPx);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = fatiaPx;
    const ctx = sliceCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, renderizadoPx, canvas.width, fatiaPx, 0, 0, canvas.width, fatiaPx);

    if (pagina > 0) pdf.addPage();

    let y = PDF_MARGIN;
    if (primeira) {
      desenharCabecalho(pdf, { titulo, periodoLabel, pageWidth, logoDataUrl });
      y = PDF_HEADER_HEIGHT;
    }

    const fatiaAlturaPt = fatiaPx / pxPerPt;
    pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', PDF_MARGIN, y, contentWidth, fatiaAlturaPt);

    desenharRodape(pdf, { pageWidth, pageHeight, pagina: pagina + 1, totalPaginas, logoDataUrl });

    renderizadoPx += fatiaPx;
    pagina += 1;
  }

  pdf.save(filename);
}
