import { apiFetch } from './api';

export async function listarCategorias({ page = 1, pageSize = 100, escopo } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  // 'produto' é o padrão do backend; só envia quando for outro escopo (ex.: 'insumo').
  if (escopo && escopo !== 'produto') params.set('escopo', escopo);
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
