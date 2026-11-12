import { apiFetch } from './api';

export async function listarProdutos({ canal = 'loja_fisica', page = 1, pageSize = 100 } = {}) {
  const params = new URLSearchParams({ canal, page, pageSize });
  const body = await apiFetch(`/produtos?${params.toString()}`);
  return body.data;
}

// Todos os produtos, juntando as páginas (o servidor entrega no máximo 100 por página). Telas que montam lista,
// busca ou contagem sobre o catálogo inteiro usam esta; com uma página só, o que passa de 100 sumiria.
export async function listarTodosProdutos({ canal = 'loja_fisica' } = {}) {
  let page = 1;
  let totalPages = 1;
  let items = [];

  do {
    const dados = await listarProdutos({ canal, page, pageSize: 100 });
    items = items.concat(dados.items ?? []);
    totalPages = dados.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return { items, total: items.length };
}

export async function buscarProduto(id) {
  const body = await apiFetch(`/produtos/${id}`);
  return body.data;
}

export async function excluirProduto(id) {
  const body = await apiFetch(`/produtos/${id}`, { method: 'DELETE' });
  return body.data;
}

export async function criarProduto(dados) {
  const body = await apiFetch('/produtos', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function atualizarProduto(id, dados) {
  const body = await apiFetch(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  return body.data;
}

export async function categorizarProduto(id, categoriaIds) {
  const body = await apiFetch(`/produtos/${id}/categoria`, {
    method: 'PATCH',
    body: JSON.stringify({ categoria_ids: categoriaIds }),
  });
  return body.data;
}
