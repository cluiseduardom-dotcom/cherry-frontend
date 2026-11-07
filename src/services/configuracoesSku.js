import { apiFetch } from './api';

function querystringEscopo(escopo) {
  return escopo && escopo !== 'produto' ? `?escopo=${encodeURIComponent(escopo)}` : '';
}

export async function listarPadroesSku({ escopo } = {}) {
  const body = await apiFetch(`/configuracoes-sku/padroes${querystringEscopo(escopo)}`);
  return body.data;
}

export async function buscarConfiguracaoSku({ escopo } = {}) {
  const body = await apiFetch(`/configuracoes-sku${querystringEscopo(escopo)}`);
  return body.data;
}

export async function salvarConfiguracaoSku(dados) {
  const body = await apiFetch('/configuracoes-sku', {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
  return body.data;
}
