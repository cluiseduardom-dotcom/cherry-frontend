// Regras puras do recorte da foto de perfil (sem DOM, testáveis). O recorte é sempre um QUADRADO da imagem;
// o resultado final é gerado no navegador (recortarFoto.js) em LADO_PERFIL x LADO_PERFIL.

export const LADO_PERFIL = 512; // px da foto final
export const ZOOM_MINIMO = 1; // 1 = o maior quadrado que cabe na imagem
export const ZOOM_MAXIMO = 4;

function limitar(valor, minimo, maximo) {
  return Math.min(Math.max(valor, minimo), maximo);
}

export function limitarZoom(zoom) {
  return limitar(Number.isFinite(zoom) ? zoom : ZOOM_MINIMO, ZOOM_MINIMO, ZOOM_MAXIMO);
}

// Quadrado de origem { sx, sy, lado } em px da imagem. `foco` (0..1) é o centro desejado do recorte;
// o quadrado é preso aos limites da imagem. null se a imagem não tem tamanho válido.
export function calcularRecorte({ largura, altura, zoom = 1, focoX = 0.5, focoY = 0.5 }) {
  if (!(largura > 0) || !(altura > 0)) return null;
  const lado = Math.min(largura, altura) / limitarZoom(zoom);
  const sx = limitar((Number.isFinite(focoX) ? focoX : 0.5) * largura - lado / 2, 0, largura - lado);
  const sy = limitar((Number.isFinite(focoY) ? focoY : 0.5) * altura - lado / 2, 0, altura - lado);
  return { sx, sy, lado };
}

// Foco (0..1) correspondente a um recorte já preso aos limites.
export function focoDoRecorte({ largura, altura }, recorte) {
  return { focoX: (recorte.sx + recorte.lado / 2) / largura, focoY: (recorte.sy + recorte.lado / 2) / altura };
}

// Arrastar a imagem `dx`/`dy` px na tela (janela de `ladoTela` px) desloca o recorte no sentido contrário.
export function moverFoco({ largura, altura, zoom, focoX, focoY }, dx, dy, ladoTela) {
  const atual = calcularRecorte({ largura, altura, zoom, focoX, focoY });
  if (!atual || !(ladoTela > 0)) return { focoX, focoY };
  const escala = ladoTela / atual.lado; // px de tela por px da imagem
  const movido = calcularRecorte({
    largura, altura, zoom,
    focoX: (atual.sx + atual.lado / 2 - dx / escala) / largura,
    focoY: (atual.sy + atual.lado / 2 - dy / escala) / altura,
  });
  return focoDoRecorte({ largura, altura }, movido);
}

// Posição/tamanho da imagem inteira dentro da janela quadrada de `ladoTela` px, para mostrar só o recorte.
export function posicaoNaJanela({ largura, altura }, recorte, ladoTela) {
  const escala = ladoTela / recorte.lado;
  return { left: -recorte.sx * escala, top: -recorte.sy * escala, width: largura * escala, height: altura * escala };
}
