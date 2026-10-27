import { apiFetch } from './api';

const json = (method, dados) => ({ method, body: JSON.stringify(dados) });

function query(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function listarInsumos() {
  return (await apiFetch('/consumos/insumos')).data;
}

export async function registrarConsumoAvulso(dados) {
  return (await apiFetch('/consumos/avulsos', json('POST', dados))).data;
}

export async function listarConsumosAvulsos(filtros = {}) {
  return (await apiFetch(`/consumos/avulsos${query(filtros)}`)).data;
}

export async function consumosDaVenda(vendaId) {
  return (await apiFetch(`/consumos/vendas/${vendaId}`)).data;
}

export async function acrescentarConsumoNaVenda(vendaId, dados) {
  return (await apiFetch(`/consumos/vendas/${vendaId}/linhas`, json('POST', dados))).data;
}

export async function retirarConsumoDaVenda(vendaId, consumoId) {
  return (await apiFetch(`/consumos/vendas/${vendaId}/linhas/${consumoId}/retirar`, { method: 'PATCH' })).data;
}

export async function regularizarConsumoDaVenda(vendaId, consumoId) {
  return (await apiFetch(`/consumos/vendas/${vendaId}/linhas/${consumoId}/regularizar`, { method: 'PATCH' })).data;
}

export async function previaSubstituicao(deInsumoId) {
  return (await apiFetch(`/consumos/substituicoes/previa${query({ de_insumo_id: deInsumoId })}`)).data;
}

export async function substituirInsumo(deInsumoId, paraInsumoId) {
  return (await apiFetch('/consumos/substituicoes', json('POST', { de_insumo_id: deInsumoId, para_insumo_id: paraInsumoId }))).data;
}

export async function relatorioConsumo(filtros = {}) {
  return (await apiFetch(`/consumos/relatorio${query(filtros)}`)).data;
}

export async function obterFichaVenda(produtoId) {
  return (await apiFetch(`/produtos/${produtoId}/ficha-venda`)).data;
}

export async function salvarFichaVenda(produtoId, itens) {
  return (await apiFetch(`/produtos/${produtoId}/ficha-venda`, json('POST', { itens }))).data;
}
