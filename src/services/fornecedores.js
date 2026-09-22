import { apiFetch } from './api';

export async function listarFornecedores({ page = 1, pageSize = 100, nome } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (nome) params.set('nome', nome);
  const body = await apiFetch(`/fornecedores?${params.toString()}`);
  return body.data;
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
