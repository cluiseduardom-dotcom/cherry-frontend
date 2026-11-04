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

// ---- Mercado Pago e extrato (backend: docs/BANCOS_API.md) ----

// → { entradas, saidas, ja_lancados, erros: [{referencia, erro}], tem_mais }
export async function sincronizarMercadoPago(contaBancariaId) {
  return (await apiFetch('/bancos/mercadopago/sincronizar', json('POST', { conta_bancaria_id: Number(contaBancariaId) }))).data;
}

// dados: { conta_bancaria_id, conteudo, formato? } → { formato, resumo, linhas, erros }
export async function previaExtrato(dados) {
  return (await apiFetch('/bancos/importacoes/previa', json('POST', dados))).data;
}

// dados: { conta_bancaria_id, conteudo, formato?, incluir_possiveis_duplicados? } → { importadas, resumo }
export async function importarExtrato(dados) {
  return (await apiFetch('/bancos/importacoes', json('POST', dados))).data;
}

// → [{ tipo_titulo, id, descricao, fornecedor, valor, data_vencimento, dias_de_diferenca }]
export async function sugestoesDoMovimento(movimentoId) {
  return (await apiFetch(`/bancos/movimentos/${encodeURIComponent(movimentoId)}/sugestoes`)).data;
}
