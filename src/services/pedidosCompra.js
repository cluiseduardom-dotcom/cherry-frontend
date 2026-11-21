import { apiFetch } from './api';
import { criarRecebimento, adicionarItemRecebimento, alterarStatusRecebimento } from './recebimentos';

// Pedido de compra (funcionalidade `compras_avancado`). Envelope {success, data}.

export async function listarPedidosCompra({ page = 1, pageSize = 50, status, fornecedor_id } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (status) params.set('status', status);
  if (fornecedor_id) params.set('fornecedor_id', fornecedor_id);
  const body = await apiFetch(`/pedidos-compra?${params.toString()}`);
  return body.data;
}

export async function buscarPedidoCompra(id) {
  const body = await apiFetch(`/pedidos-compra/${id}`);
  return body.data;
}

export async function criarPedidoCompra(dados) {
  const body = await apiFetch('/pedidos-compra', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function atualizarPedidoCompra(id, dados) {
  const body = await apiFetch(`/pedidos-compra/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  return body.data;
}

async function acaoPedido(id, acao) {
  const body = await apiFetch(`/pedidos-compra/${id}/${acao}`, { method: 'POST', body: JSON.stringify({}) });
  return body.data;
}

export const enviarPedidoCompra = (id) => acaoPedido(id, 'enviar');
export const confirmarPedidoCompra = (id) => acaoPedido(id, 'confirmar');
export const cancelarPedidoCompra = (id) => acaoPedido(id, 'cancelar');

// Prepara o recebimento do pedido com o fluxo que já existe: cria o recebimento, lança os itens e deixa CONFERIDO.
// A aprovação (entrada de estoque e conta a pagar) fica para a tela do recebimento, com confirmação.
// `itens`: [{ pedido_compra_item_id, produto_id, descricao_snapshot, quantidade_recebida }]. Devolve o recebimento criado.
export async function prepararRecebimentoDoPedido(pedido, { numero, data_recebimento }, itens) {
  const recebimento = await criarRecebimento({
    pedido_compra_id: pedido.id,
    fornecedor_id: pedido.fornecedor_id,
    numero,
    data_recebimento,
  });

  try {
    for (const item of itens) {
      await adicionarItemRecebimento(recebimento.id, item);
    }
    await alterarStatusRecebimento(recebimento.id, 'EM_CONFERENCIA');
    await alterarStatusRecebimento(recebimento.id, 'CONFERIDO');
  } catch (erro) {
    // Não deixa um recebimento pela metade: cancela o rascunho e devolve o erro original.
    try {
      await alterarStatusRecebimento(recebimento.id, 'CANCELADO');
    } catch {
      // se nem o cancelamento passar, o rascunho fica visível em Recebimentos
    }
    throw erro;
  }

  return recebimento;
}
