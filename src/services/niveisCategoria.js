import { apiFetch } from './api';

export async function listarNiveisCategoria() {
  const body = await apiFetch('/niveis-categoria');
  return body.data;
}

export async function criarNivelCategoria(dados) {
  const body = await apiFetch('/niveis-categoria', { method: 'POST', body: JSON.stringify(dados) });
  return body.data;
}

export async function atualizarNivelCategoria(id, dados) {
  const body = await apiFetch(`/niveis-categoria/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  return body.data;
}

export async function excluirNivelCategoria(id) {
  const body = await apiFetch(`/niveis-categoria/${id}`, { method: 'DELETE' });
  return body.data;
}
