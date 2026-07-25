import { apiFetch } from './api';

export async function listarEstoqueBaixo() {
  const body = await apiFetch('/produtos/estoque-baixo');
  return body.data;
}
