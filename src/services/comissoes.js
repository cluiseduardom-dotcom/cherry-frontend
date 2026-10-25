import { apiFetch } from './api';

export async function listarMinhasComissoes({ page = 1, pageSize = 20, data_inicio, data_fim } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (data_inicio) params.set('data_inicio', data_inicio);
  if (data_fim) params.set('data_fim', data_fim);

  const body = await apiFetch(`/comissoes/minhas?${params.toString()}`);
  return body.data;
}

export async function listarComissoesEquipe({ data_inicio, data_fim } = {}) {
  const params = new URLSearchParams();
  if (data_inicio) params.set('data_inicio', data_inicio);
  if (data_fim) params.set('data_fim', data_fim);

  const qs = params.toString();
  const body = await apiFetch(`/comissoes/equipe${qs ? `?${qs}` : ''}`);
  return body.data;
}

export async function listarRepasses({ status, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);

  const body = await apiFetch(`/comissoes/repasses?${params.toString()}`);
  return body.data;
}

export async function confirmarRepasse(id, { observacao } = {}) {
  const payload = {};
  if (observacao !== undefined && observacao !== null && String(observacao).trim() !== '') {
    payload.observacao = String(observacao).trim();
  }

  const options = {
    method: 'POST',
  };
  if (payload.observacao) {
    options.body = JSON.stringify(payload);
  }

  const body = await apiFetch(`/comissoes/repasses/${id}/confirmar`, options);
  return body.data;
}

export async function obterHistoricoComissao(id) {
  const body = await apiFetch(`/comissoes/${id}/historico`);
  return body.data;
}

export async function obterPercentuais() {
  const body = await apiFetch('/comissoes/percentuais');
  return body.data;
}

export async function atualizarPercentual({ usuario_id, percentual }) {
  const payload = {
    percentual: percentual === null || percentual === undefined || percentual === '' ? null : Number(percentual),
  };
  if (usuario_id !== undefined && usuario_id !== null) {
    payload.usuario_id = Number(usuario_id);
  }

  const body = await apiFetch('/comissoes/percentuais', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return body.data;
}

// ---- Pagamento da comissão AO vendedor (a empresa pagando) ----

// Quem tem `gerir_financeiro`: por vendedor, o líquido liberado ainda não pago ({ modo_pagamento,
// items: [{ vendedor_id, vendedor_nome, a_pagar, bruto_a_pagar, descontos, quantidade_comissoes,
// aguardando_fechamento }], totais: { a_pagar, aguardando_fechamento } }).
export async function listarAPagar() {
  const body = await apiFetch('/comissoes/a-pagar');
  return body.data;
}

// Admin/gerente: todos; vendedor: só os seus (o backend ignora o filtro para ele).
export async function listarPagamentosComissao({ vendedor_id, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (vendedor_id) params.set('vendedor_id', String(vendedor_id));

  const body = await apiFetch(`/comissoes/pagamentos?${params.toString()}`);
  return body.data;
}

// Quem tem `gerir_financeiro`. { vendedor_id, valor_esperado, forma, pago_em: 'AAAA-MM-DD', observacao? }
export async function registrarPagamentoComissao(dados) {
  const body = await apiFetch('/comissoes/pagamentos', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return body.data;
}

// Quando a empresa paga a comissão. Leitura: `gerir_financeiro`. Alteração: só admin.
// { modo_pagamento: 'liberada' | 'fim_do_mes', padrao, atualizado_em, atualizado_por_nome }
export async function obterConfiguracaoComissao() {
  const body = await apiFetch('/comissoes/configuracao');
  return body.data;
}

export async function definirModoPagamentoComissao(modo_pagamento) {
  const body = await apiFetch('/comissoes/configuracao', {
    method: 'PUT',
    body: JSON.stringify({ modo_pagamento }),
  });
  return body.data;
}
