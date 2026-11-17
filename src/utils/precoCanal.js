const CANAL_LABEL = { loja_fisica: 'Loja física', online: 'Online' };

export function canalLabel(canal) {
  return CANAL_LABEL[canal] ?? canal;
}

export function formatPercent(value) {
  if (value == null) return '—';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function montarPayloadPreco(modo, valor) {
  const numero = Number(valor);
  return modo === 'markup' ? { markup_percentual: numero } : { preco_venda: numero };
}

export function validarValorPreco(valor) {
  const numero = Number(valor);
  if (valor === '' || Number.isNaN(numero) || numero <= 0) {
    return 'Informe um valor maior que zero';
  }
  return '';
}
