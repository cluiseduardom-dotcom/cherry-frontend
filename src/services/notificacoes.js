import { apiFetch } from './api';

// Avisos de decisão do sino ({ total, itens: [{ id, tipo, prioridade, produto_id, sku, nome, item,
// titulo, mensagem, acao, dados }] }). Contrato: GET /notificacoes (backend, docs/NOTIFICACOES_API.md).
export async function listarNotificacoes() {
  const body = await apiFetch('/notificacoes');
  return body.data;
}
