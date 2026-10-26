// Regras puras da foto de produto no frontend (sem DOM, testáveis). O backend valida de novo tudo isto.

export const MAX_FOTOS = 5;
export const LADO_MAXIMO = 1000; // px: maior lado depois de reduzir
export const MAX_BYTES_ENVIO = 2 * 1024 * 1024; // limite do backend
export const MAX_BYTES_ORIGINAL = 15 * 1024 * 1024; // foto de celular antes de reduzir
export const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

// Devolve a mensagem de erro, ou '' se o arquivo pode ser processado.
export function validarArquivoFoto(arquivo) {
  if (!arquivo) return 'Selecione uma foto';
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return 'Formato inválido: use JPEG, PNG ou WebP';
  if (arquivo.size > MAX_BYTES_ORIGINAL) return 'A foto é grande demais (máximo 15 MB)';
  return '';
}

// Reduz mantendo a proporção; nunca amplia.
export function calcularDimensoes(largura, altura, lado = LADO_MAXIMO) {
  if (!(largura > 0) || !(altura > 0)) return { largura: 0, altura: 0 };
  const maior = Math.max(largura, altura);
  if (maior <= lado) return { largura: Math.round(largura), altura: Math.round(altura) };
  const fator = lado / maior;
  return { largura: Math.max(1, Math.round(largura * fator)), altura: Math.max(1, Math.round(altura * fator)) };
}

// Nova ordem de ids ao mover a foto de `indice` uma posição (-1 = para a esquerda, +1 = para a direita).
// Fora dos limites devolve a lista como está.
export function moverFoto(ids, indice, direcao) {
  const destino = indice + direcao;
  if (indice < 0 || indice >= ids.length || destino < 0 || destino >= ids.length) return [...ids];
  const novo = [...ids];
  [novo[indice], novo[destino]] = [novo[destino], novo[indice]];
  return novo;
}

// Coloca a foto escolhida em primeiro (principal), mantendo a ordem relativa das demais.
export function definirPrincipal(ids, id) {
  if (!ids.includes(id)) return [...ids];
  return [id, ...ids.filter((x) => x !== id)];
}

export function podeAdicionarFoto(quantidade) {
  return quantidade < MAX_FOTOS;
}
