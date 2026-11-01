import { apiFetch } from './api';

// Operador da plataforma (Vertumno): taxa da plataforma a receber por empresa no mês.
// mes = 'AAAA-MM'; sem mes o backend usa o mês corrente de Brasília.
export async function obterTaxasPlataforma(mes) {
  const query = mes ? `?mes=${encodeURIComponent(mes)}` : '';
  const body = await apiFetch(`/plataforma/taxas${query}`);
  return body.data;
}

// ---- Administração comercial (só plataforma_admin; o backend é quem barra de fato) ----

const jsonPost = dados => ({ method: 'POST', body: JSON.stringify(dados) });

export async function listarPlanosComerciais() {
  const body = await apiFetch('/plataforma/planos');
  return body.data;
}

export async function listarEmpresasComercial() {
  const body = await apiFetch('/plataforma/empresas/comercial');
  return body.data;
}

export async function obterHistoricoComercial(empresaId) {
  const body = await apiFetch(`/plataforma/empresas/${encodeURIComponent(empresaId)}/comercial/historico`);
  return body.data;
}

// dados: { plano, vigencia_inicio?, justificativa }
export async function trocarPlanoEmpresa(empresaId, dados) {
  const body = await apiFetch(`/plataforma/empresas/${encodeURIComponent(empresaId)}/plano`, jsonPost(dados));
  return body.data;
}

// dados: { percentual, vigencia_inicio?, vigencia_fim?, justificativa }
export async function definirCondicaoEmpresa(empresaId, dados) {
  const body = await apiFetch(`/plataforma/empresas/${encodeURIComponent(empresaId)}/condicao`, jsonPost(dados));
  return body.data;
}

// dados: { a_partir_de?, justificativa }
export async function encerrarCondicaoEmpresa(empresaId, dados) {
  const body = await apiFetch(`/plataforma/empresas/${encodeURIComponent(empresaId)}/condicao/encerrar`, jsonPost(dados));
  return body.data;
}

// ---- Identidade visual por cliente (só plataforma_admin; o backend é quem barra de fato) ----

// → { temas: ['vertumno', ...], empresas: [{ empresa_id, empresa_nome, status, tema_visual, slug }] }
export async function listarIdentidades() {
  const body = await apiFetch('/plataforma/empresas/identidade');
  return body.data;
}

export async function obterHistoricoIdentidade(empresaId) {
  const body = await apiFetch(`/plataforma/empresas/${encodeURIComponent(empresaId)}/identidade/historico`);
  return body.data;
}

// dados: só o que muda — { tema_visual?, slug? } (slug null remove o endereço).
export async function atualizarIdentidade(empresaId, dados) {
  const body = await apiFetch(`/plataforma/empresas/${encodeURIComponent(empresaId)}/identidade`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
  return body.data;
}
