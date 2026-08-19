import { apiFetch } from './api';

export async function listarDespesasFixas() {
  const body = await apiFetch('/despesas-fixas');
  return body.data;
}

export async function criarDespesaFixa(dados) {
  const body = await apiFetch('/despesas-fixas', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function atualizarDespesaFixa(id, dados) {
  const body = await apiFetch(`/despesas-fixas/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  return body.data;
}

export async function removerDespesaFixa(id) {
  const body = await apiFetch(`/despesas-fixas/${id}`, { method: 'DELETE' });
  return body.data;
}

export async function alternarAtivoDespesaFixa(id) {
  const body = await apiFetch(`/despesas-fixas/${id}/toggle`, { method: 'PATCH' });
  return body.data;
}
