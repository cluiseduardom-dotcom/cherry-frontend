import { apiFetch } from './api';

// Relatórios de gestão (backend: docs/RELATORIOS_API.md em cherry-backend). Somente leitura.

function consulta(parametros) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
  }
  return params.toString();
}

async function buscar(caminho, parametros) {
  const texto = consulta(parametros);
  const body = await apiFetch(texto ? `${caminho}?${texto}` : caminho);
  return body.data;
}

export function obterAnaliseVendas({ data_de, data_ate }) {
  return buscar('/relatorios/vendas', { data_de, data_ate });
}

export function obterDesempenhoVendedores({ data_de, data_ate }) {
  return buscar('/relatorios/desempenho', { data_de, data_ate });
}

// ordem: 'receita' | 'quantidade' | 'margem' (margem só vale com permissão de custos; o backend cai para receita).
export function obterRelatorioProdutos({ data_de, data_ate, ordem, limite }) {
  return buscar('/relatorios/produtos', { data_de, data_ate, ordem, limite });
}

// tipo: 'produto' | 'insumo'. local_id opcional. somente_com_saldo: boolean (padrão do backend: true).
export function obterInventario({ local_id, tipo, somente_com_saldo, page, pageSize } = {}) {
  return buscar('/relatorios/inventario', {
    local_id,
    tipo,
    somente_com_saldo: typeof somente_com_saldo === 'boolean' ? somente_com_saldo : undefined,
    page,
    pageSize,
  });
}

export function obterRelatorioCredito({ data_ref } = {}) {
  return buscar('/relatorios/credito', { data_ref });
}
