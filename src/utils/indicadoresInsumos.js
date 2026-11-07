// Apresentação dos indicadores de insumos (GET /consumos/indicadores). As regras de cálculo ficam no backend.

export const PERIODOS_DIAS = [30, 60, 90, 180, 365];

export const ROTULO_MOTIVO_REPOSICAO = {
  esgotado: 'Esgotado',
  abaixo_minimo: 'Abaixo do mínimo',
  pendencia: 'Venda sem baixa (falta de insumo)',
};

const TOM_MOTIVO = { esgotado: 'badge-danger', abaixo_minimo: 'badge-warning', pendencia: 'badge-info' };

export function selosDeReposicao(insumo) {
  const motivos = Array.isArray(insumo?.motivos_reposicao) ? insumo.motivos_reposicao : [];
  return motivos.map(m => ({ key: m, rotulo: ROTULO_MOTIVO_REPOSICAO[m] ?? m, tom: TOM_MOTIVO[m] ?? 'badge-primary' }));
}

export function formatarCobertura(dias) {
  if (dias === null || dias === undefined) return 'sem consumo';
  return `${Number(dias).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
}

export function formatarMediaDiaria(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

// Quem precisa de reposição primeiro: esgotados, depois abaixo do mínimo, depois pendências; dentro do grupo, menor cobertura.
const PESO = { esgotado: 0, abaixo_minimo: 1, pendencia: 2 };

export function ordenarPorUrgencia(insumos) {
  const lista = Array.isArray(insumos) ? insumos : [];
  const peso = i => Math.min(...(i.motivos_reposicao?.length ? i.motivos_reposicao.map(m => PESO[m] ?? 3) : [9]));
  const cobertura = i => (i.cobertura_dias === null || i.cobertura_dias === undefined ? Infinity : Number(i.cobertura_dias));

  return [...lista].sort((a, b) => peso(a) - peso(b) || cobertura(a) - cobertura(b) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}
