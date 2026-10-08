// Regra de exibição da lista de produtos do PDV (tela Nova Venda).
// A lista principal representa o que o operador consegue vender agora:
//  - vendável (preço no canal + estoque > 0): aparece normalmente;
//  - esgotado (estoque 0): continua visível, mas ao FINAL da lista (informativo);
//  - sem preço no canal: fora da lista (não dá para vender — o backend recusa
//    com 409 "Produto sem preço definido para o canal");
//  - insumo / material interno (tipo = 'insumo'): fora da lista.
// É só organização da vitrine: os bloqueios de preço e estoque continuam no
// ProductRow, no carrinho e no backend, sem alteração.

export function ehInsumo(produto) {
  return produto.tipo === 'insumo';
}

export function ehEsgotado(produto) {
  return produto.stock === 0;
}

export function selecionarProdutosPdv(produtos) {
  const exibiveis = produtos.filter(p => p.price != null && !ehInsumo(p));
  // sort estável: preserva a ordem original dentro de cada grupo
  return [...exibiveis].sort((a, b) => Number(ehEsgotado(a)) - Number(ehEsgotado(b)));
}
