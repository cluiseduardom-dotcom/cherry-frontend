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

// Produtos que o PDV esconde só por falta de preço no canal (insumos não contam: nunca são
// vendidos). Usado para avisar o operador, em vez de a vitrine parecer simplesmente vazia.
export function contarSemPrecoNoCanal(produtos) {
  return produtos.filter(p => p.price == null && !ehInsumo(p)).length;
}

export function mensagemSemPreco(qtd, podeDefinirPreco) {
  if (!qtd) return '';
  const produtos = qtd === 1 ? '1 produto ativo está' : `${qtd} produtos ativos estão`;
  const acao = podeDefinirPreco
    ? 'Defina o preço em Produtos, no botão $ de cada produto.'
    : 'Peça a um administrador para definir o preço.';
  return `${produtos} sem preço neste canal e não aparece${qtd === 1 ? '' : 'm'} aqui. ${acao}`;
}
