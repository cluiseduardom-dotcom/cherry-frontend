import { apiFetch } from './api';

export async function listarEstoqueBaixo() {
  const body = await apiFetch('/produtos/estoque-baixo');
  return body.data;
}

export async function registrarMovimentacaoEstoque(produtoId, dados) {
  const body = await apiFetch(`/produtos/${produtoId}/movimentacoes`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return body.data;
}

export async function listarMovimentacoesProduto(produtoId, { page = 1, pageSize = 100 } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  const body = await apiFetch(`/produtos/${produtoId}/movimentacoes?${params.toString()}`);
  return body.data;
}
