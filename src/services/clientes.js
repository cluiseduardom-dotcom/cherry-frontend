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

// PATCH /clientes/:id — ver docs/ai/CLIENTES-HUB-BACKEND-CONTRACT.md: este
// endpoint ainda não existe no backend na data desta implementação. Chamar
// esta função hoje resulta em 404 até o contrato documentado ser
// implementado no cherry-backend.
export async function atualizarCliente(id, dados) {
  const body = await apiFetch(`/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(dados) });
  return body.data;
}

export async function buscarHistoricoCliente(id) {
  const body = await apiFetch(`/clientes/${id}/historico`);
  return body.data;
}
