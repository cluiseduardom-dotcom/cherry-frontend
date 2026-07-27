import { apiFetch } from './api';

export async function criarVenda({ canal = 'loja_fisica', cliente_id, itens }) {
  const payload = { canal, itens };
  if (cliente_id) payload.cliente_id = cliente_id;

  const body = await apiFetch('/vendas', { method: 'POST', body: JSON.stringify(payload) });
  return body.data;
}
