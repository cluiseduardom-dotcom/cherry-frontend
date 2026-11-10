import { ALTURA_MAXIMA, MAX_BYTES_RETRATO, tamanhoReduzido } from './lojaRetratos';

// Reduz a foto no navegador antes de enviar (celular manda foto de vários MB): altura máxima 1920 px, WebP, e baixa a
// qualidade até caber no limite do servidor. WebP mantém a transparência (foto recortada continua recortada).
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

/** Devolve { arquivo, largura, altura }. */
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
    canvas.getContext('2d').drawImage(img, 0, 0, largura, altura);

    for (const qualidade of [0.86, 0.75, 0.62]) {
      const blob = await paraBlob(canvas, qualidade);
      if (blob && blob.size <= MAX_BYTES_RETRATO) {
        return { arquivo: new File([blob], 'retrato.webp', { type: 'image/webp' }), largura, altura };
      }
    }

    alturaMaxima = Math.round(alturaMaxima * 0.8);
  }

  throw new Error('A foto ficou grande demais mesmo depois de reduzida. Tente uma foto menor.');
}
