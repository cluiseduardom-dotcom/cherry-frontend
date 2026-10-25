import { apiFetch } from './api';

// Acerto do local, calculado do histórico (nada é digitado). `desde` = 'AAAA-MM-DD' opcional.
// Equipe vê qualquer local; o vendedor, só a própria maleta.
export async function acertoDoLocal(localId, { desde } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);

  const query = params.toString();
  const body = await apiFetch(`/estoque/locais/${localId}/acerto${query ? `?${query}` : ''}`);
  return body.data;
}

export async function listarConferencias(localId, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  const body = await apiFetch(`/estoque/locais/${localId}/conferencias?${params.toString()}`);
  return body.data;
}

// Só equipe. { itens: [{ produto_id, quantidade_contada }], observacao?, aplicar_ajuste? }
// aplicar_ajuste só é aceito para admin (o backend recusa os demais com 403).
export async function criarConferencia(localId, dados) {
  const body = await apiFetch(`/estoque/locais/${localId}/conferencias`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return body.data;
}
