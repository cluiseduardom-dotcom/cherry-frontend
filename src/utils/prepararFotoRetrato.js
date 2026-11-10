import { ALTURA_MAXIMA, ALVO_BYTES_RETRATO, MAX_BYTES_RETRATO, tamanhoReduzido } from './lojaRetratos';
import { removerFundoLiso } from './removerFundoLiso';

// Reduz a foto no navegador antes de enviar (celular manda foto de vários MB): altura máxima 1600 px, WebP, e baixa a
// qualidade até caber no limite do servidor. WebP mantém a transparência. Se o fundo for liso, também gera a versão SEM
// FUNDO (a pessoa escolhe qual usar na tela).
function carregar(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir esta imagem. Use uma foto JPEG, PNG ou WebP.')); };
    img.src = url;
  });
}

const paraBlob = (canvas, qualidade) => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', qualidade));

// Menor versão que cabe no alvo (ou a menor que couber no limite do servidor); null se nenhuma couber.
async function codificar(canvas) {
  let menor = null;

  for (const qualidade of [0.82, 0.72, 0.62, 0.52]) {
    const blob = await paraBlob(canvas, qualidade);
    if (blob && (!menor || blob.size < menor.size)) menor = blob;
    if (blob && blob.size <= ALVO_BYTES_RETRATO) break;
  }

  return menor && menor.size <= MAX_BYTES_RETRATO ? new File([menor], 'retrato.webp', { type: 'image/webp' }) : null;
}

/** Devolve { arquivo, semFundo, acao, largura, altura }. `semFundo` só existe quando o fundo liso foi removido. */
export async function prepararFotoRetrato(arquivo) {
  if (!arquivo || !/^image\/(jpeg|png|webp)$/.test(arquivo.type)) {
    throw new Error('Envie uma foto JPEG, PNG ou WebP.');
  }

  const img = await carregar(arquivo);
  let alturaMaxima = ALTURA_MAXIMA;

  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const { largura, altura } = tamanhoReduzido(img.naturalWidth, img.naturalHeight, alturaMaxima);
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, largura, altura);

    const original = await codificar(canvas);

    if (original) {
      const pixels = ctx.getImageData(0, 0, largura, altura);
      const { acao } = removerFundoLiso(pixels.data, largura, altura);
      let semFundo = null;

      if (acao === 'removido') {
        ctx.putImageData(pixels, 0, 0);
        semFundo = await codificar(canvas);
      }

      return { arquivo: original, semFundo, acao: semFundo || acao !== 'removido' ? acao : 'fundo_complexo', largura, altura };
    }

    alturaMaxima = Math.round(alturaMaxima * 0.8);
  }

  throw new Error('A foto ficou grande demais mesmo depois de reduzida. Tente uma foto menor.');
}
