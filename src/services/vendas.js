import { apiFetch } from './api';

export async function criarVenda({ canal = 'loja_fisica', cliente_id, itens, forma_pagamento, dias_prazo }) {
  const payload = { canal, itens };
  if (cliente_id) payload.cliente_id = cliente_id;
  if (forma_pagamento) payload.forma_pagamento = forma_pagamento;
  if (forma_pagamento === 'prazo') payload.dias_prazo = dias_prazo;

  const body = await apiFetch('/vendas', { method: 'POST', body: JSON.stringify(payload) });
  return body.data;
}

export async function listarVendas({ page = 1, pageSize = 100 } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  const body = await apiFetch(`/vendas?${params.toString()}`);
  return body.data;
}

export async function cancelarVenda(id) {
  const body = await apiFetch(`/vendas/${id}/cancelar`, { method: 'PATCH' });
  return body.data;
}

export async function buscarVenda(id) {
  const body = await apiFetch(`/vendas/${id}`);
  return body.data;
}
