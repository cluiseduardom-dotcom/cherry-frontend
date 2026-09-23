import { apiFetch } from './api';

export async function buscarConfiguracaoSku() {
  const body = await apiFetch('/configuracoes-sku');
  return body.data;
}

export async function salvarConfiguracaoSku(dados) {
  const body = await apiFetch('/configuracoes-sku', {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
  return body.data;
}
