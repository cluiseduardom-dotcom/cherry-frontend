import { apiFetch } from './api';

// PCP (backend: docs/PCP_NECESSIDADE_MATERIAL.md e docs/PCP_ORDEM_PRODUCAO.md em cherry-backend).
// Tudo sob a funcionalidade `pcp`; ficha técnica segue aberta para admin/estoquista.

const json = (method, dados) => ({ method, body: JSON.stringify(dados ?? {}) });

function consulta(parametros = {}) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export async function listarOrdens({ status, produto_id, page = 1, pageSize = 20 } = {}) {
  return (await apiFetch(`/producoes/ordens${consulta({ status, produto_id, page, pageSize })}`)).data;
}

export async function buscarOrdem(id) {
  return (await apiFetch(`/producoes/ordens/${id}`)).data;
}

export async function criarOrdem({ produto_id, quantidade_planejada, prazo, observacao }) {
  const corpo = { produto_id, quantidade_planejada };
  if (prazo) corpo.prazo = prazo;
  if (observacao) corpo.observacao = observacao;
  return (await apiFetch('/producoes/ordens', json('POST', corpo))).data;
}

export async function iniciarOrdem(id) {
  return (await apiFetch(`/producoes/ordens/${id}/iniciar`, json('PATCH'))).data;
}

export async function concluirOrdem(id, { quantidade_produzida, quantidade_perdida }) {
  return (await apiFetch(`/producoes/ordens/${id}/concluir`, json('PATCH', { quantidade_produzida, quantidade_perdida }))).data;
}

export async function regularizarInsumos(id) {
  return (await apiFetch(`/producoes/ordens/${id}/regularizar-insumos`, json('PATCH'))).data;
}

export async function cancelarOrdem(id, motivo) {
  return (await apiFetch(`/producoes/ordens/${id}/cancelar`, json('PATCH', { motivo }))).data;
}

// Prévia do que uma produção consumiria (somente leitura). É informativa: faltar insumo não impede produzir.
export async function obterNecessidade({ produto_id, quantidade }) {
  return (await apiFetch(`/producoes/necessidade${consulta({ produto_id, quantidade })}`)).data;
}

// Ficha técnica (receita): insumos consumidos por UNIDADE do produto acabado. Salvar cria uma nova versão.
export async function obterFichaTecnica(produtoId) {
  return (await apiFetch(`/produtos/${produtoId}/ficha-tecnica`)).data;
}

export async function salvarFichaTecnica(produtoId, itens) {
  return (await apiFetch(`/produtos/${produtoId}/ficha-tecnica`, json('POST', { itens }))).data;
}
