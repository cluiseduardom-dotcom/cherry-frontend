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
