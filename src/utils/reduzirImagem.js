import { LADO_MAXIMO, MAX_BYTES_ENVIO, calcularDimensoes } from './fotoProduto';

// Reduz a foto no navegador (maior lado ~1000 px) e devolve um File WebP (ou JPEG, onde o navegador não
// gera WebP) com no máximo 2 MB. Roda só no navegador (canvas); a lógica de tamanho está em fotoProduto.js.
function canvasParaBlob(canvas, tipo, qualidade) {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
}

export async function reduzirImagem(arquivo) {
  const bitmap = await createImageBitmap(arquivo);
  try {
    const { largura, altura } = calcularDimensoes(bitmap.width, bitmap.height, LADO_MAXIMO);
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, largura, altura);

    // WebP onde houver suporte; senão JPEG. Baixa a qualidade até caber no limite do backend.
    for (const tipo of ['image/webp', 'image/jpeg']) {
      for (const qualidade of [0.85, 0.75, 0.65, 0.5]) {
        const blob = await canvasParaBlob(canvas, tipo, qualidade);
        if (!blob || blob.type !== tipo) break; // navegador não gera este tipo: tenta o próximo
        if (blob.size <= MAX_BYTES_ENVIO) {
          const extensao = tipo === 'image/webp' ? 'webp' : 'jpg';
          return new File([blob], `foto.${extensao}`, { type: tipo });
        }
      }
    }

    throw new Error('Não foi possível reduzir a foto. Tente outra imagem.');
  } finally {
    bitmap.close?.();
  }
}
