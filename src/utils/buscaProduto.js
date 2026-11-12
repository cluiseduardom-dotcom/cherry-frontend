// Busca de produto para seletores com digitação (lógica pura, sem React).
// Regras: ignora maiúsculas, acentos e espaços repetidos; a busca por várias palavras exige TODAS
// (ex.: "anel zirc" acha "Anel regulável com zircônias"); acha por nome ou por código (SKU / código de barras).
// Ordem: código exato, código começando com o digitado, nome começando com o digitado, depois o resto por nome.

export const LIMITE_RESULTADOS = 50;

export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const codigosDe = (p) => [p.sku, p.codigo_barras].filter(Boolean).map(normalizar);

function pontuar(p, termos, consulta) {
  const nome = normalizar(p.nome);
  const codigos = codigosDe(p);
  const palheiro = [nome, ...codigos].join(' ');

  if (!termos.every((t) => palheiro.includes(t))) return null;
  if (codigos.some((c) => c === consulta)) return 0;
  if (codigos.some((c) => c.startsWith(consulta))) return 1;
  if (nome.startsWith(consulta)) return 2;

  return 3;
}

/**
 * Filtra e ordena os produtos para a lista de sugestões.
 * Sem texto: os primeiros por nome. `total` é quantos combinam (pode ser maior que `itens`, que é limitado).
 */
export function buscarProdutos(produtos, consulta, limite = LIMITE_RESULTADOS) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const q = normalizar(consulta);
  const termos = q ? q.split(' ') : [];

  const combinados = [];
  for (const p of lista) {
    const pontos = termos.length ? pontuar(p, termos, q) : 3;
    if (pontos !== null) combinados.push({ p, pontos });
  }

  combinados.sort((a, b) => a.pontos - b.pontos || String(a.p.nome).localeCompare(String(b.p.nome), 'pt-BR'));

  return { itens: combinados.slice(0, limite).map((c) => c.p), total: combinados.length };
}

/** Texto mostrado no campo quando há produto escolhido. */
export const rotuloDoProduto = (p) => (p ? `${p.nome}${p.sku ? ` (${p.sku})` : ''}` : '');

/** Índice da próxima opção destacada pelas setas (circular). Lista vazia = -1. */
export function moverDestaque(atual, total, passo) {
  if (total <= 0) return -1;
  if (atual < 0) return passo > 0 ? 0 : total - 1;

  return (atual + passo + total) % total;
}
