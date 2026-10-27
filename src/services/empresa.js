import { apiFetch } from './api';

export async function obterDadosEmpresa() {
  const body = await apiFetch('/empresa/dados');
  return body.data;
}

// Atualização parcial: manda só os campos informados; string vazia limpa um campo opcional.
export async function atualizarDadosEmpresa(dados) {
  const body = await apiFetch('/empresa/dados', {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
  return body.data;
}
