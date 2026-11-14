import { apiFetch } from './api';

export async function listarContasReceber({ page = 1, pageSize = 20, status, vencimentoDe, vencimentoAte } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (status) params.set('status', status);
  if (vencimentoDe) params.set('vencimento_de', vencimentoDe);
  if (vencimentoAte) params.set('vencimento_ate', vencimentoAte);

  const body = await apiFetch(`/contas-receber?${params.toString()}`);
  return body.data;
}

// Recebe o restante de uma vez (rota antiga, mantida por compatibilidade).
export async function marcarContaReceberComoRecebida(id) {
  const body = await apiFetch(`/contas-receber/${id}/receber`, { method: 'PATCH' });
  return body.data;
}

// Recebimento total ou parcial. Contrato (backend, docs/CONTAS_RECEBER_API.md): POST /contas-receber/:id/recebimentos com
// Idempotency-Key obrigatória. Sem `valor`, o servidor recebe o restante. Conta com parcela aceita parcial; conta antiga (sem
// parcela) só por inteiro. Só os campos do contrato vão no corpo (empresa, parcela e status nunca).
export async function receberContaReceber(id, { valor, forma_pagamento, observacao }, chave) {
  const corpo = {
    ...(valor !== undefined && valor !== null ? { valor } : {}),
    ...(forma_pagamento ? { forma_pagamento } : {}),
    ...(observacao ? { observacao } : {}),
  };
  const body = await apiFetch(`/contas-receber/${id}/recebimentos`, {
    method: 'POST',
    body: JSON.stringify(corpo),
    headers: { 'Idempotency-Key': chave },
  });
  return body.data;
}

export async function listarRecebimentosContaReceber(id) {
  const body = await apiFetch(`/contas-receber/${id}/recebimentos`);
  return body.data;
}
