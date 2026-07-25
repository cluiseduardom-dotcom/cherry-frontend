import { apiFetch } from './api';

export async function listarProdutos({ canal = 'loja_fisica', page = 1, pageSize = 100 } = {}) {
  const params = new URLSearchParams({ canal, page, pageSize });
  const body = await apiFetch(`/produtos?${params.toString()}`);
  return body.data;
}

export async function excluirProduto(id) {
  const body = await apiFetch(`/produtos/${id}`, { method: 'DELETE' });
  return body.data;
}
