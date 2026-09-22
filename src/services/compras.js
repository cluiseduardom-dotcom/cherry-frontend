import { apiFetch } from './api';

export async function listarCompras({ page = 1, pageSize = 50, fornecedor_id, data_de, data_ate } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (fornecedor_id) params.set('fornecedor_id', fornecedor_id);
  if (data_de) params.set('data_de', data_de);
  if (data_ate) params.set('data_ate', data_ate);
  const body = await apiFetch(`/compras?${params.toString()}`);
  return body.data;
}

export async function buscarCompra(id) {
  const body = await apiFetch(`/compras/${id}`);
  return body.data;
}

export async function criarCompra(dados) {
  const body = await apiFetch('/compras', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return body.data;
}

export async function cancelarCompra(id) {
  const body = await apiFetch(`/compras/${id}/cancelar`, { method: 'PATCH' });
  return body.data;
}
