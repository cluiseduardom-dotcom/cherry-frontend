import { jsPDF } from 'jspdf';
import { expandirCopias, mmParaPt, planoDaEtiqueta, posicoesNaFolha } from './etiquetaProduto';

// Renderizadores do plano de etiqueta. Só desenham; as decisões de layout estão em etiquetaProduto.js.

// A Nimbot D110 imprime a 203 dpi (informação do fabricante que NÃO foi conferida nesta máquina). Se for outra,
// a etiqueta continua certa em tamanho físico no app, só muda a nitidez.
export const DPI_NIMBOT = 203;

export function renderizarEtiquetaPng(dados, { larguraMm, alturaMm }, dpi = DPI_NIMBOT) {
  const pxPorMm = dpi / 25.4;
  const plano = planoDaEtiqueta(dados, { larguraMm, alturaMm, passoMm: 1 / pxPorMm });
  const canvas = document.createElement('canvas');

  canvas.width = Math.round(larguraMm * pxPorMm);
  canvas.height = Math.round(alturaMm * pxPorMm);

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';

  for (const b of plano.barras) {
    const x = Math.round(b.x * pxPorMm);
    const w = Math.max(1, Math.round(b.w * pxPorMm));

    ctx.fillRect(x, Math.round(b.y * pxPorMm), w, Math.round(b.h * pxPorMm));
  }

  for (const t of plano.textos) {
    ctx.font = `${t.negrito ? '700 ' : ''}${Math.max(6, Math.round(t.alturaFonteMm * pxPorMm))}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = t.alinhamento;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(t.texto, Math.round(t.x * pxPorMm), Math.round(t.y * pxPorMm));
  }

  return { canvas, plano };
}

export function canvasParaBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))), 'image/png');
  });
}

export function gerarPdfFolha(itens, cfg) {
  const etiquetas = expandirCopias(itens);

  if (etiquetas.length === 0) throw new Error('Nenhuma etiqueta para imprimir.');

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const posicoes = posicoesNaFolha(etiquetas.length, cfg);
  let paginaAtual = 0;

  etiquetas.forEach((etiqueta, i) => {
    const { pagina, x, y } = posicoes[i];

    if (pagina !== paginaAtual) {
      doc.addPage();
      paginaAtual = pagina;
    }

    const plano = planoDaEtiqueta(etiqueta, { larguraMm: cfg.larguraMm, alturaMm: cfg.alturaMm });

    doc.setFillColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);

    for (const b of plano.barras) doc.rect(x + b.x, y + b.y, b.w, b.h, 'F');

    for (const t of plano.textos) {
      doc.setFont('helvetica', t.negrito ? 'bold' : 'normal');
      doc.setFontSize(mmParaPt(t.alturaFonteMm));
      doc.text(t.texto, x + t.x, y + t.y, { align: t.alinhamento });
    }
  });

  return doc;
}
