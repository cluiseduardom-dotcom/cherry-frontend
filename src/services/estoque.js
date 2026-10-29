import { apiFetch } from './api';

// Evento global: o menu lateral escuta e recarrega o aviso de estoque baixo/esgotado.
export const EVENTO_ESTOQUE_ALTERADO = 'estoque:alterado';

function avisarEstoqueAlterado() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_ESTOQUE_ALTERADO));
}

export async function listarEstoqueBaixo() {
  const body = await apiFetch('/produtos/estoque-baixo');
  return body.data;
}

export async function registrarMovimentacaoEstoque(produtoId, dados) {
  const body = await apiFetch(`/produtos/${produtoId}/movimentacoes`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  avisarEstoqueAlterado();
  return body.data;
}

export async function listarMovimentacoesProduto(produtoId, { page = 1, pageSize = 100 } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  const body = await apiFetch(`/produtos/${produtoId}/movimentacoes?${params.toString()}`);
  return body.data;
}

export async function listarMovimentacoesRelatorio({ page = 1, pageSize = 100, produto_id, data_de, data_ate } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (produto_id) params.set('produto_id', produto_id);
  if (data_de) params.set('data_de', data_de);
  if (data_ate) params.set('data_ate', data_ate);

  const body = await apiFetch(`/produtos/movimentacoes?${params.toString()}`);
  return body.data;
}
