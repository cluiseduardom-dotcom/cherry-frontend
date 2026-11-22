import { apiFetch } from './api';

// Cotações (funcionalidade `compras_avancado`). Envelope {success, data}.

export async function listarCotacoes({ page = 1, pageSize = 50, status } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (status) params.set('status', status);
  const body = await apiFetch(`/cotacoes?${params.toString()}`);
  return body.data;
}

export async function buscarCotacao(id) {
  const body = await apiFetch(`/cotacoes/${id}`);
  return body.data;
}

export async function criarCotacao(dados) {
  const body = await apiFetch('/cotacoes', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function registrarProposta(id, fornecedorId, itens) {
  const body = await apiFetch(`/cotacoes/${id}/fornecedores/${fornecedorId}/oferta`, { method: 'PUT', body: JSON.stringify({ itens }) });
  return body.data;
}

export async function recusarFornecedor(id, fornecedorId) {
  const body = await apiFetch(`/cotacoes/${id}/fornecedores/${fornecedorId}/recusar`, { method: 'POST', body: JSON.stringify({}) });
  return body.data;
}

export async function cancelarCotacao(id) {
  const body = await apiFetch(`/cotacoes/${id}/cancelar`, { method: 'POST', body: JSON.stringify({}) });
  return body.data;
}

// escolhas: [{ cotacao_item_id, fornecedor_id }] → { cotacao, pedidos: [{ id, numero, fornecedor_id, total }] }
export async function gerarPedidos(id, escolhas) {
  const body = await apiFetch(`/cotacoes/${id}/gerar-pedidos`, { method: 'POST', body: JSON.stringify({ escolhas }) });
  return body.data;
}
