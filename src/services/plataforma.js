import { apiFetch } from './api';

// Operador da plataforma (Vertumno): taxa da plataforma a receber por empresa no mês.
// mes = 'AAAA-MM'; sem mes o backend usa o mês corrente de Brasília.
export async function obterTaxasPlataforma(mes) {
  const query = mes ? `?mes=${encodeURIComponent(mes)}` : '';
  const body = await apiFetch(`/plataforma/taxas${query}`);
  return body.data;
}
