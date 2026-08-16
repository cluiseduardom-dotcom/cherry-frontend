import { apiFetch } from './api';

export async function listarContasReceber({ page = 1, pageSize = 20, status, vencimentoDe, vencimentoAte } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (status) params.set('status', status);
  if (vencimentoDe) params.set('vencimento_de', vencimentoDe);
  if (vencimentoAte) params.set('vencimento_ate', vencimentoAte);

  const body = await apiFetch(`/contas-receber?${params.toString()}`);
  return body.data;
}

export async function marcarContaReceberComoRecebida(id) {
  const body = await apiFetch(`/contas-receber/${id}/receber`, { method: 'PATCH' });
  return body.data;
}
