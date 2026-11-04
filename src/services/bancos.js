import { apiFetch } from './api';

// Contrato real: cherry-backend docs/BANCOS_API.md (rotas /bancos, permissão gerir_financeiro).
// Ids e valores NUMERIC chegam como string.

const json = (method, dados) => ({ method, body: JSON.stringify(dados) });

export async function listarContasBancarias() {
  return (await apiFetch('/bancos/contas')).data;
}

export async function criarContaBancaria(dados) {
  return (await apiFetch('/bancos/contas', json('POST', dados))).data;
}

export async function atualizarContaBancaria(id, dados) {
  return (await apiFetch(`/bancos/contas/${encodeURIComponent(id)}`, json('PATCH', dados))).data;
}

export async function alterarStatusContaBancaria(id, status) {
  return (await apiFetch(`/bancos/contas/${encodeURIComponent(id)}/status`, json('PATCH', { status }))).data;
}

// filtros: { conta_bancaria_id?, tipo?, conciliado?, data_inicio?, data_fim?, incluir_cancelados?, limit?, offset? }
// → { items, total }
export async function listarMovimentosBancarios(filtros = {}) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
  }
  const query = params.toString();
  return (await apiFetch(`/bancos/movimentos${query ? `?${query}` : ''}`)).data;
}

// dados: { conta_bancaria_id, tipo, valor, data_movimento, descricao, observacao? }
export async function lancarMovimentoBancario(dados) {
  return (await apiFetch('/bancos/movimentos', json('POST', dados))).data;
}

export async function cancelarMovimentoBancario(id, motivo) {
  return (await apiFetch(`/bancos/movimentos/${encodeURIComponent(id)}/cancelar`, json('POST', { motivo }))).data;
}

export async function conciliarMovimentoBancario(movimentoId) {
  return (await apiFetch('/bancos/conciliacoes', json('POST', { movimento_bancario_id: Number(movimentoId) }))).data;
}

export async function desfazerConciliacaoBancaria(conciliacaoId) {
  return (await apiFetch(`/bancos/conciliacoes/${encodeURIComponent(conciliacaoId)}/desfazer`, json('POST', {}))).data;
}
