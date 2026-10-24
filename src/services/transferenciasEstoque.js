import { apiFetch } from './api';

// Equipe vê todas; os demais, só as que criaram ou em que são donos de uma ponta (maleta).
export async function listarTransferencias({ status, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (status) params.set('status', status);

  const body = await apiFetch(`/estoque/transferencias?${params.toString()}`);
  return body.data;
}

export async function obterTransferencia(id) {
  const body = await apiFetch(`/estoque/transferencias/${id}`);
  return body.data;
}

// { origem_local_id, destino_local_id, itens: [{ produto_id, quantidade }], observacao? }
export async function criarTransferencia(dados) {
  const body = await apiFetch('/estoque/transferencias', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return body.data;
}

export async function aceitarTransferencia(id) {
  const body = await apiFetch(`/estoque/transferencias/${id}/aceitar`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return body.data;
}

export async function recusarTransferencia(id, motivo) {
  const body = await apiFetch(`/estoque/transferencias/${id}/recusar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
  return body.data;
}

export async function cancelarTransferencia(id, motivo) {
  const body = await apiFetch(`/estoque/transferencias/${id}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
  return body.data;
}
