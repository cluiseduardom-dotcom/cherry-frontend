import { apiFetch } from './api';

export async function listarClientes() {
  const body = await apiFetch('/clientes');
  return body.data;
}

export async function listarRankingClientes() {
  const body = await apiFetch('/clientes/ranking');
  return body.data;
}

export async function criarCliente(dados) {
  const body = await apiFetch('/clientes', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function buscarHistoricoCliente(id) {
  const body = await apiFetch(`/clientes/${id}/historico`);
  return body.data;
}
