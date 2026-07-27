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
