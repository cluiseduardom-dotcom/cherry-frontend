import { LADO_PERFIL } from './fotoPerfil';
import { MAX_BYTES_ENVIO } from './fotoProduto';

// Gera a foto de perfil final: o quadrado `recorte` ({ sx, sy, lado } em px da imagem) em LADO_PERFIL x LADO_PERFIL,
// como File WebP (ou JPEG, onde o navegador não gera WebP) com no máximo 2 MB. Só roda no navegador (canvas);
// a matemática do recorte está em fotoPerfil.js. O backend valida tipo e tamanho de novo.
function canvasParaBlob(canvas, tipo, qualidade) {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
}

export async function recortarFoto(arquivo, recorte) {
  const bitmap = await createImageBitmap(arquivo);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = LADO_PERFIL;
    canvas.height = LADO_PERFIL;
    canvas.getContext('2d').drawImage(bitmap, recorte.sx, recorte.sy, recorte.lado, recorte.lado, 0, 0, LADO_PERFIL, LADO_PERFIL);

    for (const tipo of ['image/webp', 'image/jpeg']) {
      for (const qualidade of [0.9, 0.8, 0.7, 0.55]) {
        const blob = await canvasParaBlob(canvas, tipo, qualidade);
        if (!blob || blob.type !== tipo) break; // navegador não gera este tipo: tenta o próximo
        if (blob.size <= MAX_BYTES_ENVIO) {
          return new File([blob], `perfil.${tipo === 'image/webp' ? 'webp' : 'jpg'}`, { type: tipo });
        }
      }
    }

    throw new Error('Não foi possível preparar a foto. Tente outra imagem.');
  } finally {
    bitmap.close?.();
  }
}
