import { apiFetch } from './api';

// Locais que o usuário pode ver: equipe = Central, maletas e consignados ativos;
// vendedor = só a própria maleta (lista vazia se não tiver).
export async function listarLocais() {
  const body = await apiFetch('/estoque/locais');
  return body.data;
}

// Produtos com saldo > 0 no local ({ local, items: [{ produto_id, nome, sku, saldo }], total, ... }).
export async function saldosDoLocal(localId, { busca, page = 1, pageSize = 1000 } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (busca) params.set('busca', busca);

  const body = await apiFetch(`/estoque/locais/${localId}/saldos?${params.toString()}`);
  return body.data;
}

// Só admin. maleta: { tipo, usuario_id, nome? } · consignado: { tipo, nome, cliente_id? }.
export async function criarLocal(dados) {
  const body = await apiFetch('/estoque/locais', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return body.data;
}
