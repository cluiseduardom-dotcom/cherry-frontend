import { apiFetch } from './api';

// Grade de produtos (backend: docs/GRADE_PRODUTOS.md em cherry-backend). Sob a funcionalidade `grade`.
const json = (method, dados) => ({ method, body: JSON.stringify(dados ?? {}) });

export async function listarGrades({ page = 1, pageSize = 20 } = {}) {
  return (await apiFetch(`/grades?page=${page}&pageSize=${pageSize}`)).data;
}

export async function buscarGrade(id) {
  return (await apiFetch(`/grades/${id}`)).data;
}

export async function criarGrade(corpo) {
  return (await apiFetch('/grades', json('POST', corpo))).data;
}

export async function acrescentarVariacoes(id, variacoes) {
  return (await apiFetch(`/grades/${id}/variacoes`, json('POST', { variacoes }))).data;
}

export async function atualizarGrade(id, dados) {
  return (await apiFetch(`/grades/${id}`, json('PATCH', dados))).data;
}
