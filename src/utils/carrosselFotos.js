// Navegação do visualizador de fotos (lógica pura, testável).

// Move `delta` posições com volta ao início/fim. Total <= 0 → 0.
export function moverIndice(atual, delta, total) {
  if (!total || total <= 0) return 0;
  return (((atual + delta) % total) + total) % total;
}

// Só fotos com URL pública utilizável (url é null enquanto o bucket não tem base pública).
export function fotosVisiveis(imagens) {
  return (Array.isArray(imagens) ? imagens : []).filter(i => i && typeof i.url === 'string' && i.url);
}

// Deslizar: dx < 0 (dedo para a esquerda) → próxima; dx > 0 → anterior; abaixo do limite = nada.
export function direcaoDoSwipe(dx, limite = 40) {
  if (Math.abs(dx) < limite) return 0;
  return dx < 0 ? 1 : -1;
}
