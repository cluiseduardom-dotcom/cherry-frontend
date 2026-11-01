// Filtros e ordenação da vitrine do PDV (botão de filtros ao lado da busca). Lógica pura:
// só reordena/esconde produtos na tela; não muda preço, estoque nem o que o backend aceita vender.

export const ORDENACOES = [
  { valor: 'padrao', rotulo: 'Padrão' },
  { valor: 'nome', rotulo: 'Nome (A–Z)' },
  { valor: 'menor_preco', rotulo: 'Menor preço' },
  { valor: 'maior_preco', rotulo: 'Maior preço' },
  { valor: 'maior_estoque', rotulo: 'Maior estoque' },
];

export const FILTROS_PADRAO = Object.freeze({
  ordenar: 'padrao',
  somenteComEstoque: false,
  precoMin: '',
  precoMax: '',
});

// '12,50' / '12.50' / ' 12 ' -> 12.5; vazio ou inválido -> null (filtro desligado).
export function lerPreco(texto) {
  if (texto === null || texto === undefined) return null;
  const limpo = String(texto).trim().replace(/\s/g, '').replace(',', '.');
  if (limpo === '') return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Mensagem de erro do par mínimo/máximo, ou '' quando está tudo bem.
export function validarFaixaDePreco({ precoMin, precoMax }) {
  const campoPreenchido = (t) => String(t ?? '').trim() !== '';
  if (campoPreenchido(precoMin) && lerPreco(precoMin) === null) return 'Preço mínimo inválido.';
  if (campoPreenchido(precoMax) && lerPreco(precoMax) === null) return 'Preço máximo inválido.';
  const min = lerPreco(precoMin);
  const max = lerPreco(precoMax);
  if (min !== null && max !== null && min > max) return 'O preço mínimo é maior que o máximo.';
  return '';
}

// Quantos filtros estão ligados (a ordenação conta como um). Alimenta o contador do botão.
export function contarFiltrosAtivos(filtros) {
  const f = { ...FILTROS_PADRAO, ...filtros };
  let n = 0;
  if (f.ordenar !== 'padrao') n += 1;
  if (f.somenteComEstoque) n += 1;
  if (lerPreco(f.precoMin) !== null) n += 1;
  if (lerPreco(f.precoMax) !== null) n += 1;
  return n;
}

const semPrecoPorUltimo = (a, b, sentido) => {
  if (a.price == null && b.price == null) return 0;
  if (a.price == null) return 1;
  if (b.price == null) return -1;
  return sentido * (a.price - b.price);
};

// Recebe os produtos da vitrine (formato de toCartProduct) e devolve uma lista nova.
// Faixa de preço inválida (mín > máx) é ignorada em vez de esvaziar a tela.
export function aplicarFiltrosVitrine(produtos, filtros) {
  const f = { ...FILTROS_PADRAO, ...filtros };
  const faixaOk = validarFaixaDePreco(f) === '';
  const min = faixaOk ? lerPreco(f.precoMin) : null;
  const max = faixaOk ? lerPreco(f.precoMax) : null;

  const lista = produtos.filter((p) => {
    if (f.somenteComEstoque && !(Number(p.stock) > 0)) return false;
    if (min !== null && !(p.price != null && p.price >= min)) return false;
    if (max !== null && !(p.price != null && p.price <= max)) return false;
    return true;
  });

  const copia = [...lista];
  switch (f.ordenar) {
    case 'nome':
      return copia.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    case 'menor_preco':
      return copia.sort((a, b) => semPrecoPorUltimo(a, b, 1));
    case 'maior_preco':
      return copia.sort((a, b) => semPrecoPorUltimo(a, b, -1));
    case 'maior_estoque':
      return copia.sort((a, b) => Number(b.stock) - Number(a.stock));
    default:
      return copia;
  }
}
