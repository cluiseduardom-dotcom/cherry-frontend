import { apiFetch } from './api';

export async function listarContasPagar({ page = 1, pageSize = 20, status, vencimentoDe, vencimentoAte } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (status) params.set('status', status);
  if (vencimentoDe) params.set('vencimento_de', vencimentoDe);
  if (vencimentoAte) params.set('vencimento_ate', vencimentoAte);

  const body = await apiFetch(`/contas-pagar?${params.toString()}`);
  return body.data;
}

export async function criarContaPagar(dados) {
  const body = await apiFetch('/contas-pagar', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function atualizarContaPagar(id, dados) {
  const body = await apiFetch(`/contas-pagar/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  return body.data;
}

export async function marcarContaPagarComoPaga(id) {
  const body = await apiFetch(`/contas-pagar/${id}/pagar`, { method: 'PATCH' });
  return body.data;
}

export async function cancelarContaPagar(id) {
  const body = await apiFetch(`/contas-pagar/${id}`, { method: 'DELETE' });
  return body.data;
}
