import { apiFetch } from './api';

// Pedidos da loja online para a equipe. Contrato: GET /loja-pedidos e POST /loja-pedidos/:codigo/entrega-combinada
// (backend, docs/LOJA_API.md). Traz o contato da cliente; só admin e vendedor, só com a funcionalidade `loja_online`.
export async function listarPedidosLoja({ situacao = 'a_combinar', pagina = 1, limite = 20 } = {}) {
  const params = new URLSearchParams({ situacao, pagina: String(pagina), limite: String(limite) });
  const body = await apiFetch(`/loja-pedidos?${params.toString()}`);
  return body.data;
}

export async function marcarEntregaCombinada(codigo, observacao) {
  const texto = typeof observacao === 'string' ? observacao.trim() : '';
  const body = await apiFetch(`/loja-pedidos/${encodeURIComponent(codigo)}/entrega-combinada`, {
    method: 'POST',
    body: JSON.stringify(texto ? { observacao: texto } : {}),
  });
  return body.data;
}
