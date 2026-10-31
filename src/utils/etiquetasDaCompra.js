// Itens da compra recém-registrada no formato do EtiquetasModal: uma linha por produto, com a quantidade
// comprada (mesmo produto em duas linhas da compra soma). Produto fora da lista carregada fica de fora.
export function itensEtiquetaDaCompra(itensDaCompra, produtos) {
  const porProduto = new Map();

  for (const item of itensDaCompra ?? []) {
    const produto = (produtos ?? []).find(p => p.id === item.produto_id);
    const quantidade = Number(item.quantidade);
    if (!produto || !Number.isInteger(quantidade) || quantidade <= 0) continue;

    const atual = porProduto.get(produto.id);
    if (atual) atual.quantidade += quantidade;
    else porProduto.set(produto.id, { produto_id: produto.id, nome: produto.nome, quantidade });
  }

  return [...porProduto.values()];
}
