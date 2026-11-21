import { apiFetch } from './api';

// Preparo fiscal (backend: docs/FISCAL_PREPARO.md em cherry-backend). Só cadastro: nenhuma nota é emitida.
// Sob a funcionalidade `fiscal_cadastro`.
const json = (method, dados) => ({ method, body: JSON.stringify(dados ?? {}) });

function consulta(parametros = {}) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export async function obterProntidao() {
  return (await apiFetch('/fiscal/prontidao')).data;
}

export async function obterEmpresaFiscal() {
  return (await apiFetch('/fiscal/empresa')).data;
}

export async function salvarEmpresaFiscal(dados) {
  return (await apiFetch('/fiscal/empresa', json('PUT', dados))).data;
}

export async function listarProdutosFiscais({ filtro = 'pendentes', q, page = 1, pageSize = 20 } = {}) {
  return (await apiFetch(`/fiscal/produtos${consulta({ filtro, q, page, pageSize })}`)).data;
}

export async function atualizarProdutoFiscal(id, dados) {
  return (await apiFetch(`/fiscal/produtos/${id}`, json('PATCH', dados))).data;
}

export async function aplicarFiscalEmLote(produtoIds, dados) {
  return (await apiFetch('/fiscal/produtos/lote', json('POST', { produto_ids: produtoIds, ...dados }))).data;
}
