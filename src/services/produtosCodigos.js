import { apiFetch } from './api';

// GET /produtos/buscar-codigo/:codigo (src/routes/produtos.js no backend)
// resolve um código de barras/SKU comercial para o produto dono dele —
// existe desde a feature 038 (códigos de produtos). Substitui o matching
// local por SKU que o scanner usava antes disso existir.
export async function buscarProdutoPorCodigo(codigo) {
  const body = await apiFetch(`/produtos/buscar-codigo/${encodeURIComponent(codigo)}`);
  return body.data;
}
