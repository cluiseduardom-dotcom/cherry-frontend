import { apiFetch } from './api';

export async function listarFornecedores({ page = 1, pageSize = 100, nome } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (nome) params.set('nome', nome);
  const body = await apiFetch(`/fornecedores?${params.toString()}`);
  return body.data;
}

// Todos os fornecedores, juntando as páginas (o servidor entrega no máximo 100 por página). Telas que usam a lista
// para escolher ou para mostrar o nome de um fornecedor precisam do conjunto inteiro; com uma página só, o que
// passa de 100 sumiria da seleção e apareceria sem nome.
export async function listarTodosFornecedores({ nome } = {}) {
  let page = 1;
  let totalPages = 1;
  let items = [];

  do {
    const dados = await listarFornecedores({ page, pageSize: 100, nome });
    items = items.concat(dados.items ?? []);
    totalPages = dados.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return { items, total: items.length };
}

export async function criarFornecedor(dados) {
  const body = await apiFetch('/fornecedores', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return body.data;
}

export async function atualizarFornecedor(id, dados) {
  const body = await apiFetch(`/fornecedores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
  return body.data;
}

export async function removerFornecedor(id) {
  const body = await apiFetch(`/fornecedores/${id}`, { method: 'DELETE' });
  return body.data;
}
