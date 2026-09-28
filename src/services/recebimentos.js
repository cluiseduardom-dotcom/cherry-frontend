import { apiFetch } from './api';

// Diferente de /compras, o backend de /recebimentos responde com o corpo
// "cru" (sem envelope {success, data}) — controllers/recebimentosController.js
// usa res.json(resultado) direto em vez de utils/response.success. Por isso
// as funções abaixo retornam o corpo tal como veio, sem tentar `body.data`.

export async function listarRecebimentos({ status, pedido_compra_id, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (pedido_compra_id) params.set('pedido_compra_id', pedido_compra_id);
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);
  const query = params.toString();
  return apiFetch(`/recebimentos${query ? `?${query}` : ''}`);
}

export async function buscarRecebimento(id) {
  return apiFetch(`/recebimentos/${id}`);
}

// Exigem pedido_compra_id / pedido_compra_item_id (tabela pedidos_compra),
// que hoje não tem endpoint de criação/listagem exposto no backend — por
// isso não há tela nesta entrega que chame estas duas funções ainda.
// Mantidas para refletir o contrato real e permitir a próxima etapa (quando
// houver um seletor de pedido de compra) sem redesenhar o serviço.
export async function criarRecebimento(dados) {
  return apiFetch('/recebimentos', { method: 'POST', body: JSON.stringify(dados) });
}

export async function adicionarItemRecebimento(id, dados) {
  return apiFetch(`/recebimentos/${id}/itens`, { method: 'POST', body: JSON.stringify(dados) });
}

export async function alterarStatusRecebimento(id, status) {
  return apiFetch(`/recebimentos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

// Toda a integração transacional (entrada de estoque, atualização do
// pedido de compra, geração de conta a pagar) acontece no backend
// (integracaoRecebimentoService.aprovar) — o frontend só dispara a ação.
export async function aprovarRecebimento(id) {
  return apiFetch(`/recebimentos/${id}/aprovar`, { method: 'POST' });
}
