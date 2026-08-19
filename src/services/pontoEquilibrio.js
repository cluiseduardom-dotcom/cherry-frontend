import { apiFetch } from './api';

export async function calcularPontoEquilibrio({ dataInicio, dataFim } = {}) {
  const params = new URLSearchParams();
  if (dataInicio) params.set('data_inicio', dataInicio);
  if (dataFim) params.set('data_fim', dataFim);

  const query = params.toString();
  const body = await apiFetch(`/financeiro/ponto-equilibrio${query ? `?${query}` : ''}`);
  return body.data;
}
