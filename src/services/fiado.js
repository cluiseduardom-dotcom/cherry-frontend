import { apiFetch } from './api';

// Colheita (fiado): dívidas de clientes, pagamentos e cobrança. Contrato do backend em docs/FIADO_API.md (rota /fiado; só admin e
// vendedor, só com a funcionalidade `fiado` ligada pela GiroNex). Os três POSTs exigem Idempotency-Key: a tela gera uma chave por
// tentativa de lançamento e a reutiliza no "tentar de novo", para a repetição nunca lançar duas vezes.
const comChave = (chave) => ({ 'Idempotency-Key': chave });

export async function resumoFiado({ de, ate } = {}) {
  const params = new URLSearchParams();
  if (de) params.set('de', de);
  if (ate) params.set('ate', ate);
  const consulta = params.toString();
  const body = await apiFetch(`/fiado/resumo${consulta ? `?${consulta}` : ''}`);
  return body.data;
}

export async function listarClientesFiado({ busca = '', comSaldo = false, pagina = 1, limite = 20 } = {}) {
  const params = new URLSearchParams({ page: String(pagina), pageSize: String(limite) });
  if (busca.trim()) params.set('busca', busca.trim());
  if (comSaldo) params.set('com_saldo', 'true');
  const body = await apiFetch(`/fiado/clientes?${params.toString()}`);
  return body.data;
}

export async function extratoFiado(clienteId, { pagina = 1, limite = 20 } = {}) {
  const params = new URLSearchParams({ page: String(pagina), pageSize: String(limite) });
  const body = await apiFetch(`/fiado/clientes/${encodeURIComponent(clienteId)}/extrato?${params.toString()}`);
  return body.data;
}

export async function lancarCompraFiado(clienteId, { valor, descricao, data }, chave) {
  const corpo = { valor, descricao, ...(data ? { data } : {}) };
  const body = await apiFetch(`/fiado/clientes/${encodeURIComponent(clienteId)}/compras`, { method: 'POST', body: JSON.stringify(corpo), headers: comChave(chave) });
  return body.data;
}

export async function lancarPagamentoFiado(clienteId, { valor, forma, data }, chave) {
  const corpo = { valor, ...(forma ? { forma } : {}), ...(data ? { data } : {}) };
  const body = await apiFetch(`/fiado/clientes/${encodeURIComponent(clienteId)}/pagamentos`, { method: 'POST', body: JSON.stringify(corpo), headers: comChave(chave) });
  return body.data;
}

export async function estornarLancamentoFiado(lancamentoId, motivo, chave) {
  const body = await apiFetch(`/fiado/lancamentos/${encodeURIComponent(lancamentoId)}/estorno`, { method: 'POST', body: JSON.stringify({ motivo }), headers: comChave(chave) });
  return body.data;
}

// Mensagem de cobrança + link do WhatsApp. O sistema só monta: quem envia é o comerciante.
export async function cobrancaFiado(clienteId) {
  const body = await apiFetch(`/fiado/clientes/${encodeURIComponent(clienteId)}/cobranca`);
  return body.data;
}
