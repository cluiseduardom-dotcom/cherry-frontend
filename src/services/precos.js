import { apiFetch } from './api';

export async function listarPrecosProduto(produtoId) {
  const body = await apiFetch(`/produtos/${produtoId}/precos`);
  return body.data;
}

export async function atualizarPrecoCanal(produtoId, canalId, dados) {
  const body = await apiFetch(`/produtos/${produtoId}/precos/${canalId}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
  return body.data;
}
