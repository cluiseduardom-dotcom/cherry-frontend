// Produto e insumo vivem na mesma tabela (produtos.tipo). As telas separam os dois:
// Produtos/Estoque mostram só 'acabado'; Insumos/Estoque de insumos mostram só 'insumo'.
export const TIPO_ACABADO = 'acabado';
export const TIPO_INSUMO = 'insumo';

export function tipoDoProduto(produto) {
  return produto?.tipo === TIPO_INSUMO ? TIPO_INSUMO : TIPO_ACABADO;
}

export function doTipo(produto, tipo = TIPO_ACABADO) {
  return tipoDoProduto(produto) === tipo;
}
