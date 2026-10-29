import { apiFetch } from './api';

// Pix cobrado pelo Mercado Pago no PDV (admin e vendedor). Contrato: backend /pagamentos-gateway.
// Resposta: { codigo, status, valor, qr_code, qr_code_base64, ticket_url, expira_em, expira_em_segundos, expirada }.
// Nunca traz a taxa da plataforma nem ids internos.
export async function criarCobrancaPix(valor) {
  const body = await apiFetch('/pagamentos-gateway/pix', {
    method: 'POST',
    body: JSON.stringify({ valor }),
  });
  return body.data;
}

// Antes de cobrar: { pix: boolean, motivo: null | 'nao_configurado' | 'loja_nao_conectada' }.
// Só o estado da integração; não consulta o Mercado Pago. Contrato: backend GET /pagamentos-gateway/disponibilidade.
export async function consultarDisponibilidadePix() {
  const body = await apiFetch('/pagamentos-gateway/disponibilidade');
  return body.data;
}

export async function consultarCobrancaPix(codigo) {
  const body = await apiFetch(`/pagamentos-gateway/${encodeURIComponent(codigo)}`);
  return body.data;
}
