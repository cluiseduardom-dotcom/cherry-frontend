import { apiFetch } from './api';

export async function obterConfiguracaoFinanceira() {
  const body = await apiFetch('/configuracoes-financeiras');
  return body.data;
}

export async function atualizarConfiguracaoFinanceira(aliquotaImposto) {
  const body = await apiFetch('/configuracoes-financeiras', {
    method: 'PUT',
    body: JSON.stringify({ aliquota_imposto: aliquotaImposto }),
  });
  return body.data;
}
