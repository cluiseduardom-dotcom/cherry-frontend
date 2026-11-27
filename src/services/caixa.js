import { apiFetch } from './api';

// Caixa por PDV. Contrato do backend em docs/CAIXA_API.md (rota /caixa; só com a funcionalidade `caixa` ligada pela GiroNex e com
// a capacidade `operar_caixa` ou `gerir_caixas`). O movimento (sangria/suprimento) exige Idempotency-Key: a tela gera uma chave por
// tentativa e a reutiliza no "tentar de novo", para a repetição nunca lançar o dinheiro duas vezes. empresa_id e usuário nunca vão
// no corpo: o servidor os tira do login. O esperado do fechamento é calculado pelo servidor; a tela só informa o que foi contado.

export async function listarCaixas() {
  const body = await apiFetch('/caixa/caixas');
  return body.data.caixas;
}

export async function criarCaixa(nome) {
  const body = await apiFetch('/caixa/caixas', { method: 'POST', body: JSON.stringify({ nome }) });
  return body.data.caixa;
}

export async function alterarAtivoCaixa(id, ativo) {
  const body = await apiFetch(`/caixa/caixas/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ ativo }) });
  return body.data.caixa;
}

// A sessão aberta do próprio usuário com o resumo, ou null quando não há.
export async function sessaoAtual() {
  const body = await apiFetch('/caixa/sessao-atual');
  return body.data.atual;
}

export async function listarSessoes({ status, caixaId, pagina = 1, limite = 20 } = {}) {
  const params = new URLSearchParams({ page: String(pagina), pageSize: String(limite) });
  if (status) params.set('status', status);
  if (caixaId) params.set('caixa_id', String(caixaId));
  const body = await apiFetch(`/caixa/sessoes?${params.toString()}`);
  return body.data;
}

export async function detalharSessao(id) {
  const body = await apiFetch(`/caixa/sessoes/${encodeURIComponent(id)}`);
  return body.data;
}

export async function abrirSessao({ caixaId, saldoInicial }) {
  const body = await apiFetch('/caixa/sessoes', { method: 'POST', body: JSON.stringify({ caixa_id: caixaId, saldo_inicial: saldoInicial }) });
  return body.data.sessao;
}

export async function lancarMovimento(sessaoId, { tipo, valor, motivo }, chave) {
  const body = await apiFetch(`/caixa/sessoes/${encodeURIComponent(sessaoId)}/movimentos`, {
    method: 'POST',
    body: JSON.stringify({ tipo, valor, motivo }),
    headers: { 'Idempotency-Key': chave },
  });
  return body.data.movimento;
}

export async function fecharSessao(sessaoId, { conferencia, justificativa }) {
  const corpo = { conferencia, ...(justificativa ? { justificativa } : {}) };
  const body = await apiFetch(`/caixa/sessoes/${encodeURIComponent(sessaoId)}/fechamento`, { method: 'POST', body: JSON.stringify(corpo) });
  return body.data;
}
