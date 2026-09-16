import { apiFetch } from './api';

export async function listarCategorias({ page = 1, pageSize = 100 } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  const body = await apiFetch(`/categorias?${params.toString()}`);
  return body.data;
}

export async function criarCategoria(dados) {
  const body = await apiFetch('/categorias', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function atualizarCategoria(id, dados) {
  const body = await apiFetch(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  return body.data;
}

export async function excluirCategoria(id) {
  const body = await apiFetch(`/categorias/${id}`, { method: 'DELETE' });
  return body.data;
}
